#include <windows.h>
#include <audioclient.h>
#include <audiopolicy.h>
#include <mmdeviceapi.h>
#include <tlhelp32.h>
#include <wrl/client.h>

#include <algorithm>
#include <atomic>
#include <chrono>
#include <cmath>
#include <condition_variable>
#include <cstdio>
#include <cstdlib>
#include <iostream>
#include <map>
#include <mutex>
#include <set>
#include <sstream>
#include <string>
#include <thread>
#include <vector>

using Microsoft::WRL::ComPtr;

namespace {

constexpr int kTickIntervalMs = 10;
constexpr int kRescanIntervalMs = 250;
constexpr int kDefaultDuckFadeMs = 150;
constexpr int kDefaultRestoreFadeMs = 200;
constexpr float kVolumeChangeTolerance = 0.025f;
constexpr float kVolumeConvergeEpsilon = 0.005f;

struct TrackedSession {
  ComPtr<ISimpleAudioVolume> volume;
  float origVolume = 1.0f;
  float currentVolume = 1.0f;
  float lastSetVolume = 1.0f;
  DWORD pid = 0;
};

class AudioAttenuator {
public:
  AudioAttenuator(std::set<DWORD> initialExcludedPids)
      : explicitExcludedPids_(std::move(initialExcludedPids)) {
    explicitExcludedPids_.insert(GetCurrentProcessId());
  }

  bool initialize() {
    ComPtr<IMMDeviceEnumerator> enumerator;
    HRESULT hr = CoCreateInstance(
        __uuidof(MMDeviceEnumerator),
        nullptr,
        CLSCTX_INPROC_SERVER,
        IID_PPV_ARGS(&enumerator));
    return SUCCEEDED(hr) && enumerator != nullptr;
  }

  void start() {
    worker_ = std::thread([this]() { runWorker(); });
  }

  void setExcludedPids(std::set<DWORD> pids) {
    std::lock_guard<std::mutex> lock(mutex_);
    pids.insert(GetCurrentProcessId());
    explicitExcludedPids_ = std::move(pids);
    cv_.notify_all();
  }

  void duck(float duckPercent, int fadeMs) {
    std::lock_guard<std::mutex> lock(mutex_);
    duckAmount_ = std::clamp(duckPercent / 100.0f, 0.0f, 1.0f);
    fadeDurationMs_ = std::max(10, fadeMs);
    isDucked_ = duckAmount_ > 0.0f;
    forceRescan_ = true;
    cv_.notify_all();
  }

  void restore(int fadeMs) {
    std::lock_guard<std::mutex> lock(mutex_);
    isDucked_ = false;
    duckAmount_ = 0.0f;
    fadeDurationMs_ = std::max(10, fadeMs);
    cv_.notify_all();
  }

  void stopAndRestoreImmediately() {
    {
      std::lock_guard<std::mutex> lock(mutex_);
      stopping_ = true;
      cv_.notify_all();
    }
    if (worker_.joinable()) {
      worker_.join();
    }
  }

private:
  std::set<DWORD> buildExcludedPidTree(const std::set<DWORD>& rootPids) {
    std::set<DWORD> excluded = rootPids;
    HANDLE snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
    if (snapshot == INVALID_HANDLE_VALUE) {
      return excluded;
    }

    std::multimap<DWORD, DWORD> childrenByParent;
    PROCESSENTRY32W entry{};
    entry.dwSize = sizeof(entry);

    if (Process32FirstW(snapshot, &entry)) {
      do {
        childrenByParent.emplace(entry.th32ParentProcessID, entry.th32ProcessID);
      } while (Process32NextW(snapshot, &entry));
    }
    CloseHandle(snapshot);

    std::vector<DWORD> queue(excluded.begin(), excluded.end());
    while (!queue.empty()) {
      DWORD current = queue.back();
      queue.pop_back();
      auto range = childrenByParent.equal_range(current);
      for (auto it = range.first; it != range.second; ++it) {
        if (excluded.insert(it->second).second) {
          queue.push_back(it->second);
        }
      }
    }

    return excluded;
  }

  void enumerateEndpointSessions(
      IMMDeviceEnumerator* enumerator,
      ERole role,
      const std::set<DWORD>& excludedPids,
      bool captureNewActiveSessions,
      std::map<std::wstring, TrackedSession>& sessions) {
    ComPtr<IMMDevice> device;
    if (FAILED(enumerator->GetDefaultAudioEndpoint(eRender, role, &device)) || !device) {
      return;
    }

    ComPtr<IAudioSessionManager2> manager;
    if (FAILED(device->Activate(
            __uuidof(IAudioSessionManager2),
            CLSCTX_INPROC_SERVER,
            nullptr,
            reinterpret_cast<void**>(manager.GetAddressOf()))) ||
        !manager) {
      return;
    }

    ComPtr<IAudioSessionEnumerator> sessionEnum;
    if (FAILED(manager->GetSessionEnumerator(&sessionEnum)) || !sessionEnum) {
      return;
    }

    int count = 0;
    if (FAILED(sessionEnum->GetCount(&count))) {
      return;
    }

    for (int i = 0; i < count; ++i) {
      ComPtr<IAudioSessionControl> control;
      if (FAILED(sessionEnum->GetSession(i, &control)) || !control) {
        continue;
      }

      ComPtr<IAudioSessionControl2> control2;
      if (FAILED(control.As(&control2)) || !control2) {
        continue;
      }

      if (control2->IsSystemSoundsSession() == S_OK) {
        continue;
      }

      DWORD pid = 0;
      if (FAILED(control2->GetProcessId(&pid)) || pid == 0) {
        continue;
      }

      if (excludedPids.count(pid) > 0) {
        continue;
      }

      AudioSessionState state = AudioSessionStateInactive;
      if (FAILED(control->GetState(&state)) || state == AudioSessionStateExpired) {
        continue;
      }

      LPWSTR rawId = nullptr;
      std::wstring sessionKey;
      if (SUCCEEDED(control2->GetSessionInstanceIdentifier(&rawId)) && rawId) {
        sessionKey = rawId;
        CoTaskMemFree(rawId);
      } else {
        sessionKey = L"pid:" + std::to_wstring(pid);
      }

      auto existing = sessions.find(sessionKey);
      if (existing != sessions.end()) {
        continue;
      }

      if (!captureNewActiveSessions || state != AudioSessionStateActive) {
        continue;
      }

      ComPtr<ISimpleAudioVolume> simpleVolume;
      if (FAILED(control.As(&simpleVolume)) || !simpleVolume) {
        continue;
      }

      float masterVol = 1.0f;
      if (FAILED(simpleVolume->GetMasterVolume(&masterVol))) {
        continue;
      }

      TrackedSession tracked;
      tracked.volume = simpleVolume;
      tracked.origVolume = std::clamp(masterVol, 0.0f, 1.0f);
      tracked.currentVolume = tracked.origVolume;
      tracked.lastSetVolume = tracked.origVolume;
      tracked.pid = pid;
      sessions.emplace(std::move(sessionKey), std::move(tracked));
    }
  }

  void restoreAllImmediately(std::map<std::wstring, TrackedSession>& sessions) {
    for (auto& [key, session] : sessions) {
      if (session.volume) {
        session.volume->SetMasterVolume(
            std::clamp(session.origVolume, 0.0f, 1.0f), nullptr);
      }
    }
    sessions.clear();
  }

  void runWorker() {
    HRESULT hr = CoInitializeEx(nullptr, COINIT_MULTITHREADED);
    bool comInitialized = SUCCEEDED(hr);

    ComPtr<IMMDeviceEnumerator> enumerator;
    CoCreateInstance(
        __uuidof(MMDeviceEnumerator),
        nullptr,
        CLSCTX_INPROC_SERVER,
        IID_PPV_ARGS(&enumerator));

    std::map<std::wstring, TrackedSession> sessions;
    auto lastScanTime = std::chrono::steady_clock::now() -
                        std::chrono::milliseconds(kRescanIntervalMs * 2);

    while (true) {
      bool isDucked = false;
      float duckAmount = 0.0f;
      int fadeDurationMs = kDefaultDuckFadeMs;
      bool forceRescan = false;
      std::set<DWORD> rootExcludedPids;

      {
        std::unique_lock<std::mutex> lock(mutex_);
        if (stopping_) {
          break;
        }

        if (!isDucked_ && sessions.empty()) {
          cv_.wait(lock, [this]() { return stopping_ || isDucked_; });
          if (stopping_) {
            break;
          }
        }

        isDucked = isDucked_;
        duckAmount = duckAmount_;
        fadeDurationMs = fadeDurationMs_;
        forceRescan = forceRescan_;
        forceRescan_ = false;
        rootExcludedPids = explicitExcludedPids_;
      }

      auto now = std::chrono::steady_clock::now();
      bool shouldScan =
          forceRescan ||
          (isDucked &&
           std::chrono::duration_cast<std::chrono::milliseconds>(now - lastScanTime)
                   .count() >= kRescanIntervalMs);

      if (shouldScan && enumerator) {
        auto excludedTree = buildExcludedPidTree(rootExcludedPids);

        // If any already-tracked session belongs to a newly excluded PID, restore it immediately
        for (auto it = sessions.begin(); it != sessions.end();) {
          if (excludedTree.count(it->second.pid) > 0) {
            if (it->second.volume) {
              it->second.volume->SetMasterVolume(it->second.origVolume, nullptr);
            }
            it = sessions.erase(it);
          } else {
            ++it;
          }
        }

        enumerateEndpointSessions(
            enumerator.Get(), eMultimedia, excludedTree, isDucked, sessions);
        enumerateEndpointSessions(
            enumerator.Get(), eConsole, excludedTree, isDucked, sessions);
        lastScanTime = now;
      }

      float factor = isDucked ? std::clamp(1.0f - duckAmount, 0.0f, 1.0f) : 1.0f;
      float maxStep =
          static_cast<float>(kTickIntervalMs) / static_cast<float>(std::max(10, fadeDurationMs));

      for (auto it = sessions.begin(); it != sessions.end();) {
        TrackedSession& s = it->second;
        if (!s.volume) {
          it = sessions.erase(it);
          continue;
        }

        float actualVol = s.currentVolume;
        if (FAILED(s.volume->GetMasterVolume(&actualVol))) {
          it = sessions.erase(it);
          continue;
        }

        // Detect external user adjustment in Windows Volume Mixer
        if (std::fabs(actualVol - s.lastSetVolume) > kVolumeChangeTolerance) {
          if (isDucked && factor > 0.05f) {
            s.origVolume = std::clamp(actualVol / factor, 0.0f, 1.0f);
          } else {
            s.origVolume = std::clamp(actualVol, 0.0f, 1.0f);
          }
          s.currentVolume = actualVol;
          s.lastSetVolume = actualVol;
        }

        float targetVol = std::clamp(s.origVolume * factor, 0.0f, 1.0f);
        float diff = targetVol - s.currentVolume;
        float step = std::max(0.005f, s.origVolume * maxStep);

        if (std::fabs(diff) <= std::max(step, kVolumeConvergeEpsilon)) {
          s.currentVolume = targetVol;
        } else if (diff > 0.0f) {
          s.currentVolume = std::min(targetVol, s.currentVolume + step);
        } else {
          s.currentVolume = std::max(targetVol, s.currentVolume - step);
        }

        if (std::fabs(s.currentVolume - s.lastSetVolume) > 0.001f ||
            std::fabs(actualVol - s.currentVolume) > 0.001f) {
          s.volume->SetMasterVolume(s.currentVolume, nullptr);
          s.lastSetVolume = s.currentVolume;
        }

        if (!isDucked &&
            std::fabs(s.currentVolume - s.origVolume) <= kVolumeConvergeEpsilon) {
          s.volume->SetMasterVolume(s.origVolume, nullptr);
          it = sessions.erase(it);
        } else {
          ++it;
        }
      }

      std::unique_lock<std::mutex> lock(mutex_);
      cv_.wait_for(
          lock, std::chrono::milliseconds(kTickIntervalMs), [this]() {
            return stopping_ || forceRescan_;
          });
    }

    restoreAllImmediately(sessions);

    if (comInitialized) {
      CoUninitialize();
    }
  }

  std::mutex mutex_;
  std::condition_variable cv_;
  std::thread worker_;
  std::set<DWORD> explicitExcludedPids_;
  bool isDucked_ = false;
  float duckAmount_ = 0.0f;
  int fadeDurationMs_ = kDefaultDuckFadeMs;
  bool forceRescan_ = false;
  bool stopping_ = false;
};

AudioAttenuator* g_attenuator = nullptr;

BOOL WINAPI consoleCtrlHandler(DWORD ctrlType) {
  if (ctrlType == CTRL_C_EVENT || ctrlType == CTRL_BREAK_EVENT ||
      ctrlType == CTRL_CLOSE_EVENT || ctrlType == CTRL_SHUTDOWN_EVENT) {
    if (g_attenuator) {
      g_attenuator->stopAndRestoreImmediately();
    }
  }
  return FALSE;
}

} // namespace

int main(int argc, char* argv[]) {
  HRESULT hr = CoInitializeEx(nullptr, COINIT_MULTITHREADED);
  if (FAILED(hr)) {
    std::fprintf(stderr, "Failed to initialize COM: 0x%08lx\n", static_cast<unsigned long>(hr));
    return 1;
  }

  std::set<DWORD> initialExcludedPids;
  for (int i = 1; i < argc; ++i) {
    char* end = nullptr;
    unsigned long pid = std::strtoul(argv[i], &end, 10);
    if (end != argv[i] && *end == '\0' && pid > 0) {
      initialExcludedPids.insert(static_cast<DWORD>(pid));
    } else {
      std::fprintf(stderr, "Invalid PID argument: %s\n", argv[i]);
      CoUninitialize();
      return 1;
    }
  }

  AudioAttenuator attenuator(initialExcludedPids);
  if (!attenuator.initialize()) {
    std::fprintf(stderr, "WASAPI audio endpoint enumerator unavailable\n");
    CoUninitialize();
    return 1;
  }

  g_attenuator = &attenuator;
  SetConsoleCtrlHandler(consoleCtrlHandler, TRUE);

  attenuator.start();

  std::printf("READY\n");
  std::fflush(stdout);

  std::string line;
  while (std::getline(std::cin, line)) {
    if (!line.empty() && line.back() == '\r') {
      line.pop_back();
    }
    if (line.empty()) {
      continue;
    }

    std::istringstream iss(line);
    std::string cmd;
    iss >> cmd;

    if (cmd == "PING") {
      std::printf("PONG\n");
      std::fflush(stdout);
    } else if (cmd == "DUCK") {
      float percent = 50.0f;
      int fadeMs = kDefaultDuckFadeMs;
      if (iss >> percent) {
        if (!(iss >> fadeMs)) {
          fadeMs = kDefaultDuckFadeMs;
        }
        attenuator.duck(percent, fadeMs);
        std::printf("OK\n");
        std::fflush(stdout);
      } else {
        std::printf("ERR invalid DUCK arguments\n");
        std::fflush(stdout);
      }
    } else if (cmd == "RESTORE") {
      int fadeMs = kDefaultRestoreFadeMs;
      if (!(iss >> fadeMs)) {
        fadeMs = kDefaultRestoreFadeMs;
      }
      attenuator.restore(fadeMs);
      std::printf("OK\n");
      std::fflush(stdout);
    } else if (cmd == "EXCLUDE") {
      std::set<DWORD> pids = initialExcludedPids;
      unsigned long pid = 0;
      while (iss >> pid) {
        if (pid > 0) {
          pids.insert(static_cast<DWORD>(pid));
        }
      }
      attenuator.setExcludedPids(std::move(pids));
      std::printf("OK\n");
      std::fflush(stdout);
    } else if (cmd == "QUIT") {
      break;
    } else {
      std::printf("ERR unknown command\n");
      std::fflush(stdout);
    }
  }

  attenuator.stopAndRestoreImmediately();
  g_attenuator = nullptr;
  CoUninitialize();
  return 0;
}
