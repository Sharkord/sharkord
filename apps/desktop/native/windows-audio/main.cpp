#include <windows.h>
#include <audioclient.h>
#include <audioclientactivationparams.h>
#include <mmdeviceapi.h>
#include <wrl.h>
#include <fcntl.h>
#include <io.h>
#include <cstdio>
#include <thread>
#include <vector>

using Microsoft::WRL::ComPtr;
using Microsoft::WRL::RuntimeClass;
using Microsoft::WRL::RuntimeClassFlags;
using Microsoft::WRL::ClassicCom;
using Microsoft::WRL::FtmBase;

// the async operation owns this handler until completion, including after a timeout.
class Activation final : public RuntimeClass<RuntimeClassFlags<ClassicCom>, FtmBase,
    IActivateAudioInterfaceCompletionHandler> {
public:
    HANDLE ready = CreateEventW(nullptr, TRUE, FALSE, nullptr);
    HRESULT result = E_PENDING;
    ComPtr<IAudioClient> client;
    ~Activation() { if (ready) CloseHandle(ready); }
    STDMETHODIMP ActivateCompleted(IActivateAudioInterfaceAsyncOperation* operation) override {
        HRESULT activationResult = E_FAIL;
        ComPtr<IUnknown> object;
        result = operation->GetActivateResult(&activationResult, &object);
        if (SUCCEEDED(result)) result = activationResult;
        if (SUCCEEDED(result)) result = object.As(&client);
        SetEvent(ready);
        return S_OK;
    }
};

static int fail(const char* step, HRESULT result) {
    fprintf(stderr, "%s: 0x%08lx\n", step, static_cast<unsigned long>(result));
    return 1;
}

static BOOL CALLBACK findUwpProcess(HWND child, LPARAM target) {
    wchar_t name[128]{};
    GetClassNameW(child, name, 128);
    if (wcscmp(name, L"Windows.UI.Core.CoreWindow") != 0) return TRUE;
    GetWindowThreadProcessId(child, reinterpret_cast<DWORD*>(target));
    return FALSE;
}

int wmain(int argc, wchar_t** argv) {
    if (argc != 2) return 2;
    wchar_t* end = nullptr;
    const auto value = _wcstoui64(argv[1], &end, 10);
    if (!value || *end) return 2;
    const HWND window = reinterpret_cast<HWND>(static_cast<uintptr_t>(value));
    DWORD pid = 0;
    GetWindowThreadProcessId(window, &pid);
    if (!IsWindow(window) || !pid) return fail("window no longer exists", E_INVALIDARG);
    wchar_t className[128]{};
    GetClassNameW(window, className, 128);
    // legacy uwp windows belong to a host process; the child owns their audio.
    if (wcscmp(className, L"ApplicationFrameWindow") == 0)
        EnumChildWindows(window, findUwpProcess, reinterpret_cast<LPARAM>(&pid));

    HRESULT hr = CoInitializeEx(nullptr, COINIT_MULTITHREADED);
    if (FAILED(hr)) return fail("COM initialization", hr);
    AUDIOCLIENT_ACTIVATION_PARAMS params{};
    params.ActivationType = AUDIOCLIENT_ACTIVATION_TYPE_PROCESS_LOOPBACK;
    params.ProcessLoopbackParams.TargetProcessId = pid;
    params.ProcessLoopbackParams.ProcessLoopbackMode = PROCESS_LOOPBACK_MODE_INCLUDE_TARGET_PROCESS_TREE;
    PROPVARIANT property{};
    property.vt = VT_BLOB;
    property.blob.cbSize = sizeof(params);
    property.blob.pBlobData = reinterpret_cast<BYTE*>(&params);
    auto handler = Microsoft::WRL::Make<Activation>();
    if (!handler || !handler->ready) return fail("activation event", E_OUTOFMEMORY);
    ComPtr<IActivateAudioInterfaceAsyncOperation> operation;
    hr = ActivateAudioInterfaceAsync(VIRTUAL_AUDIO_DEVICE_PROCESS_LOOPBACK, __uuidof(IAudioClient),
        &property, handler.Get(), &operation);
    if (FAILED(hr)) return fail("process loopback activation", hr);
    if (WaitForSingleObject(handler->ready, 5000) != WAIT_OBJECT_0)
        return fail("activation timeout", HRESULT_FROM_WIN32(WAIT_TIMEOUT));
    if (FAILED(handler->result)) return fail("process loopback unavailable", handler->result);

    WAVEFORMATEX format{};
    format.wFormatTag = WAVE_FORMAT_IEEE_FLOAT;
    format.nChannels = 2;
    format.nSamplesPerSec = 48000;
    format.wBitsPerSample = 32;
    format.nBlockAlign = 8;
    format.nAvgBytesPerSec = 384000;
    auto client = handler->client;
    hr = client->Initialize(AUDCLNT_SHAREMODE_SHARED,
        AUDCLNT_STREAMFLAGS_LOOPBACK | AUDCLNT_STREAMFLAGS_AUTOCONVERTPCM,
        200000, 0, &format, nullptr);
    if (FAILED(hr)) return fail("audio initialization", hr);
    ComPtr<IAudioCaptureClient> capture;
    hr = client->GetService(IID_PPV_ARGS(&capture));
    if (FAILED(hr)) return fail("capture service", hr);
    hr = client->Start();
    if (FAILED(hr)) return fail("capture start", hr);

    _setmode(_fileno(stdout), _O_BINARY);
    setvbuf(stdout, nullptr, _IONBF, 0);
    // fixed float32, stereo, 48 khz; stdout never contains diagnostic text.
    if (fwrite("SAUDIO1\n", 1, 8, stdout) != 8) return 1;
    const HANDLE stopped = CreateEventW(nullptr, TRUE, FALSE, nullptr);
    if (!stopped) return fail("stop event", E_OUTOFMEMORY);
    std::thread([stopped] { getchar(); SetEvent(stopped); }).detach();
    int exitCode = 0;
    while (WaitForSingleObject(stopped, 10) == WAIT_TIMEOUT && IsWindow(window)) {
        UINT32 packet = 0;
        hr = capture->GetNextPacketSize(&packet);
        if (FAILED(hr)) { exitCode = fail("packet size", hr); break; }
        while (packet) {
            BYTE* data = nullptr;
            UINT32 frames = 0;
            DWORD flags = 0;
            hr = capture->GetBuffer(&data, &frames, &flags, nullptr, nullptr);
            if (FAILED(hr)) { exitCode = fail("audio buffer", hr); break; }
            const size_t length = static_cast<size_t>(frames) * format.nBlockAlign;
            std::vector<BYTE> silence;
            if (flags & AUDCLNT_BUFFERFLAGS_SILENT) {
                silence.resize(length, 0);
                data = silence.data();
            }
            const auto written = fwrite(data, 1, length, stdout);
            capture->ReleaseBuffer(frames);
            if (written != length) { exitCode = 1; break; }
            hr = capture->GetNextPacketSize(&packet);
            if (FAILED(hr)) { exitCode = fail("packet size", hr); break; }
        }
        if (exitCode) break;
    }
    client->Stop();
    // the input thread can still be blocked; process exit closes its event and handles.
    return exitCode;
}
