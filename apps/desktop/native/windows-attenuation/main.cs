using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading;

namespace SharkordAudioAttenuation
{
    internal enum EDataFlow
    {
        eRender = 0,
        eCapture = 1,
        eAll = 2
    }

    internal enum ERole
    {
        eConsole = 0,
        eMultimedia = 1,
        eCommunications = 2
    }

    internal enum AudioSessionState
    {
        AudioSessionStateInactive = 0,
        AudioSessionStateActive = 1,
        AudioSessionStateExpired = 2
    }

    [ComImport]
    [Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
    internal class MMDeviceEnumeratorComObject
    {
    }

    [ComImport]
    [Guid("A95664D2-9614-4F35-A746-DE8DB63617E6")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface IMMDeviceEnumerator
    {
        int EnumAudioEndpoints(EDataFlow dataFlow, int dwStateMask, out IntPtr ppDevices);
        [PreserveSig]
        int GetDefaultAudioEndpoint(EDataFlow dataFlow, ERole role, out IMMDevice ppEndpoint);
    }

    [ComImport]
    [Guid("D666063F-1587-4E43-81F1-B948E807363F")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface IMMDevice
    {
        [PreserveSig]
        int Activate(
            ref Guid iid,
            int dwClsCtx,
            IntPtr pActivationParams,
            [MarshalAs(UnmanagedType.IUnknown)] out object ppInterface);
    }

    [ComImport]
    [Guid("77AA99A0-1BD6-484F-8BC7-2C654C9A9B6F")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface IAudioSessionManager2
    {
        int GetAudioSessionControl(IntPtr AudioSessionGuid, int StreamFlags, out IntPtr SessionControl);
        int GetSimpleAudioVolume(IntPtr AudioSessionGuid, int StreamFlags, out ISimpleAudioVolume AudioVolume);
        [PreserveSig]
        int GetSessionEnumerator(out IAudioSessionEnumerator SessionEnum);
    }

    [ComImport]
    [Guid("E2F5BB11-0570-40CA-ACDD-3AA01277DEE8")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface IAudioSessionEnumerator
    {
        [PreserveSig]
        int GetCount(out int SessionCount);
        [PreserveSig]
        int GetSession(int SessionCount, out IAudioSessionControl2 Session);
    }

    [ComImport]
    [Guid("BFB7FF88-7239-4FC9-8FA2-07C950BE9C6D")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface IAudioSessionControl2
    {
        [PreserveSig]
        int GetState(out AudioSessionState pRetVal);
        [PreserveSig]
        int GetDisplayName(out IntPtr pRetVal);
        [PreserveSig]
        int SetDisplayName([MarshalAs(UnmanagedType.LPWStr)] string Value, ref Guid EventContext);
        [PreserveSig]
        int GetIconPath(out IntPtr pRetVal);
        [PreserveSig]
        int SetIconPath([MarshalAs(UnmanagedType.LPWStr)] string Value, ref Guid EventContext);
        [PreserveSig]
        int GetGroupingParam(out Guid pRetVal);
        [PreserveSig]
        int SetGroupingParam(ref Guid Override, ref Guid EventContext);
        [PreserveSig]
        int RegisterAudioSessionNotification(IntPtr NewNotifications);
        [PreserveSig]
        int UnregisterAudioSessionNotification(IntPtr NewNotifications);
        [PreserveSig]
        int GetSessionIdentifier(out IntPtr pRetVal);
        [PreserveSig]
        int GetSessionInstanceIdentifier(out IntPtr pRetVal);
        [PreserveSig]
        int GetProcessId(out uint pRetVal);
        [PreserveSig]
        int IsSystemSoundsSession();
        [PreserveSig]
        int SetDuckingPreference(bool optOut);
    }

    [ComImport]
    [Guid("87CE5498-68D6-44E5-9215-6DA47EF883D8")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface ISimpleAudioVolume
    {
        [PreserveSig]
        int SetMasterVolume(float fLevel, IntPtr EventContext);
        [PreserveSig]
        int GetMasterVolume(out float pfLevel);
        [PreserveSig]
        int SetMute(bool bMute, IntPtr EventContext);
        [PreserveSig]
        int GetMute(out bool pbMute);
    }

    internal sealed class TrackedSession
    {
        public ISimpleAudioVolume Volume;
        public float OrigVolume;
        public float CurrentVolume;
        public float LastSetVolume;
        public uint Pid;
    }

    internal static class Program
    {
        private const int CLSCTX_INPROC_SERVER = 0x1;
        private const uint TH32CS_SNAPPROCESS = 0x00000002;
        private const int TickIntervalMs = 10;
        private const int RescanIntervalMs = 250;
        private const int DefaultDuckFadeMs = 150;
        private const int DefaultRestoreFadeMs = 200;
        private const float VolumeChangeTolerance = 0.025f;
        private const float VolumeConvergeEpsilon = 0.005f;

        private static Guid IID_IAudioSessionManager2 = new Guid("77AA99A0-1BD6-484F-8BC7-2C654C9A9B6F");

        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
        private struct PROCESSENTRY32W
        {
            public uint dwSize;
            public uint cntUsage;
            public uint th32ProcessID;
            public IntPtr th32DefaultHeapID;
            public uint th32ModuleID;
            public uint cntThreads;
            public uint th32ParentProcessID;
            public int pcPriClassBase;
            public uint dwFlags;
            [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 260)]
            public string szExeFile;
        }

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern IntPtr CreateToolhelp32Snapshot(uint dwFlags, uint th32ProcessID);

        [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
        private static extern bool Process32FirstW(IntPtr hSnapshot, ref PROCESSENTRY32W lppe);

        [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
        private static extern bool Process32NextW(IntPtr hSnapshot, ref PROCESSENTRY32W lppe);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool CloseHandle(IntPtr hObject);

        private static readonly object SyncRoot = new object();
        private static HashSet<uint> ExplicitExcludedPids = new HashSet<uint>();
        private static bool IsDucked;
        private static float DuckAmount;
        private static int FadeDurationMs = DefaultDuckFadeMs;
        private static bool ForceRescan;
        private static bool Stopping;

        private static float Clamp01(float value)
        {
            if (value < 0.0f) return 0.0f;
            if (value > 1.0f) return 1.0f;
            return value;
        }

        private static HashSet<uint> BuildExcludedPidTree(HashSet<uint> rootPids)
        {
            var excluded = new HashSet<uint>(rootPids);
            IntPtr snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
            if (snapshot == IntPtr.Zero || snapshot == new IntPtr(-1))
            {
                return excluded;
            }

            var childrenByParent = new Dictionary<uint, List<uint>>();
            try
            {
                var entry = new PROCESSENTRY32W();
                entry.dwSize = (uint)Marshal.SizeOf(typeof(PROCESSENTRY32W));
                if (Process32FirstW(snapshot, ref entry))
                {
                    do
                    {
                        List<uint> list;
                        if (!childrenByParent.TryGetValue(entry.th32ParentProcessID, out list))
                        {
                            list = new List<uint>();
                            childrenByParent[entry.th32ParentProcessID] = list;
                        }
                        list.Add(entry.th32ProcessID);
                    } while (Process32NextW(snapshot, ref entry));
                }
            }
            finally
            {
                CloseHandle(snapshot);
            }

            var queue = new Queue<uint>(excluded);
            while (queue.Count > 0)
            {
                uint current = queue.Dequeue();
                List<uint> children;
                if (childrenByParent.TryGetValue(current, out children))
                {
                    foreach (uint child in children)
                    {
                        if (excluded.Add(child))
                        {
                            queue.Enqueue(child);
                        }
                    }
                }
            }

            return excluded;
        }

        private static void EnumerateEndpointSessions(
            IMMDeviceEnumerator enumerator,
            ERole role,
            HashSet<uint> excludedPids,
            bool captureNewActiveSessions,
            Dictionary<string, TrackedSession> sessions)
        {
            IMMDevice device;
            if (enumerator.GetDefaultAudioEndpoint(EDataFlow.eRender, role, out device) != 0 || device == null)
            {
                return;
            }

            try
            {
                object managerObj;
                if (device.Activate(ref IID_IAudioSessionManager2, CLSCTX_INPROC_SERVER, IntPtr.Zero, out managerObj) != 0 ||
                    managerObj == null)
                {
                    return;
                }

                var manager = managerObj as IAudioSessionManager2;
                if (manager == null)
                {
                    return;
                }

                IAudioSessionEnumerator sessionEnum;
                if (manager.GetSessionEnumerator(out sessionEnum) != 0 || sessionEnum == null)
                {
                    return;
                }

                int count;
                if (sessionEnum.GetCount(out count) != 0)
                {
                    return;
                }

                for (int i = 0; i < count; i++)
                {
                    IAudioSessionControl2 control2;
                    if (sessionEnum.GetSession(i, out control2) != 0 || control2 == null)
                    {
                        continue;
                    }

                    if (control2.IsSystemSoundsSession() == 0)
                    {
                        continue;
                    }

                    uint pid;
                    if (control2.GetProcessId(out pid) != 0 || pid == 0 || excludedPids.Contains(pid))
                    {
                        continue;
                    }

                    AudioSessionState state;
                    if (control2.GetState(out state) != 0 || state == AudioSessionState.AudioSessionStateExpired)
                    {
                        continue;
                    }

                    string sessionKey = null;
                    IntPtr rawId;
                    if (control2.GetSessionInstanceIdentifier(out rawId) == 0 && rawId != IntPtr.Zero)
                    {
                        sessionKey = Marshal.PtrToStringUni(rawId);
                        Marshal.FreeCoTaskMem(rawId);
                    }
                    if (string.IsNullOrEmpty(sessionKey))
                    {
                        sessionKey = "pid:" + pid.ToString(CultureInfo.InvariantCulture);
                    }

                    if (sessions.ContainsKey(sessionKey))
                    {
                        continue;
                    }

                    if (!captureNewActiveSessions || state != AudioSessionState.AudioSessionStateActive)
                    {
                        continue;
                    }

                    var simpleVol = control2 as ISimpleAudioVolume;
                    if (simpleVol == null)
                    {
                        continue;
                    }

                    float masterVol;
                    if (simpleVol.GetMasterVolume(out masterVol) != 0)
                    {
                        continue;
                    }

                    float clamped = Clamp01(masterVol);
                    sessions[sessionKey] = new TrackedSession
                    {
                        Volume = simpleVol,
                        OrigVolume = clamped,
                        CurrentVolume = clamped,
                        LastSetVolume = clamped,
                        Pid = pid
                    };
                }
            }
            catch
            {
            }
        }

        private static void RestoreAllImmediately(Dictionary<string, TrackedSession> sessions)
        {
            foreach (var kv in sessions)
            {
                try
                {
                    if (kv.Value.Volume != null)
                    {
                        kv.Value.Volume.SetMasterVolume(Clamp01(kv.Value.OrigVolume), IntPtr.Zero);
                    }
                }
                catch
                {
                }
            }
            sessions.Clear();
        }

        private static void RunWorker()
        {
            IMMDeviceEnumerator enumerator = null;
            try
            {
                enumerator = (IMMDeviceEnumerator)new MMDeviceEnumeratorComObject();
            }
            catch
            {
            }

            var sessions = new Dictionary<string, TrackedSession>();
            long lastScanTicks = 0;

            while (true)
            {
                bool isDucked;
                float duckAmount;
                int fadeDurationMs;
                bool forceRescan;
                HashSet<uint> rootExcludedPids;

                lock (SyncRoot)
                {
                    if (Stopping)
                    {
                        break;
                    }

                    while (!Stopping && !IsDucked && sessions.Count == 0)
                    {
                        Monitor.Wait(SyncRoot);
                    }

                    if (Stopping)
                    {
                        break;
                    }

                    isDucked = IsDucked;
                    duckAmount = DuckAmount;
                    fadeDurationMs = FadeDurationMs;
                    forceRescan = ForceRescan;
                    ForceRescan = false;
                    rootExcludedPids = new HashSet<uint>(ExplicitExcludedPids);
                }

                long nowMs = Environment.TickCount & int.MaxValue;
                bool shouldScan = forceRescan || (isDucked && (nowMs - lastScanTicks >= RescanIntervalMs));

                if (shouldScan && enumerator != null)
                {
                    var excludedTree = BuildExcludedPidTree(rootExcludedPids);

                    var toRemoveExcluded = new List<string>();
                    foreach (var kv in sessions)
                    {
                        if (excludedTree.Contains(kv.Value.Pid))
                        {
                            try
                            {
                                kv.Value.Volume.SetMasterVolume(kv.Value.OrigVolume, IntPtr.Zero);
                            }
                            catch
                            {
                            }
                            toRemoveExcluded.Add(kv.Key);
                        }
                    }
                    foreach (string k in toRemoveExcluded)
                    {
                        sessions.Remove(k);
                    }

                    EnumerateEndpointSessions(enumerator, ERole.eMultimedia, excludedTree, isDucked, sessions);
                    EnumerateEndpointSessions(enumerator, ERole.eConsole, excludedTree, isDucked, sessions);
                    lastScanTicks = nowMs;
                }

                float factor = isDucked ? Clamp01(1.0f - duckAmount) : 1.0f;
                float maxStep = (float)TickIntervalMs / Math.Max(10, fadeDurationMs);
                var completedKeys = new List<string>();

                foreach (var kv in sessions)
                {
                    TrackedSession s = kv.Value;
                    if (s.Volume == null)
                    {
                        completedKeys.Add(kv.Key);
                        continue;
                    }

                    float actualVol;
                    if (s.Volume.GetMasterVolume(out actualVol) != 0)
                    {
                        completedKeys.Add(kv.Key);
                        continue;
                    }

                    if (Math.Abs(actualVol - s.LastSetVolume) > VolumeChangeTolerance)
                    {
                        if (isDucked && factor > 0.05f)
                        {
                            s.OrigVolume = Clamp01(actualVol / factor);
                        }
                        else
                        {
                            s.OrigVolume = Clamp01(actualVol);
                        }
                        s.CurrentVolume = actualVol;
                        s.LastSetVolume = actualVol;
                    }

                    float targetVol = Clamp01(s.OrigVolume * factor);
                    float diff = targetVol - s.CurrentVolume;
                    float step = Math.Max(0.005f, s.OrigVolume * maxStep);

                    if (Math.Abs(diff) <= Math.Max(step, VolumeConvergeEpsilon))
                    {
                        s.CurrentVolume = targetVol;
                    }
                    else if (diff > 0.0f)
                    {
                        s.CurrentVolume = Math.Min(targetVol, s.CurrentVolume + step);
                    }
                    else
                    {
                        s.CurrentVolume = Math.Max(targetVol, s.CurrentVolume - step);
                    }

                    if (Math.Abs(s.CurrentVolume - s.LastSetVolume) > 0.001f ||
                        Math.Abs(actualVol - s.CurrentVolume) > 0.001f)
                    {
                        s.Volume.SetMasterVolume(s.CurrentVolume, IntPtr.Zero);
                        s.LastSetVolume = s.CurrentVolume;
                    }

                    if (!isDucked && Math.Abs(s.CurrentVolume - s.OrigVolume) <= VolumeConvergeEpsilon)
                    {
                        s.Volume.SetMasterVolume(s.OrigVolume, IntPtr.Zero);
                        completedKeys.Add(kv.Key);
                    }
                }

                foreach (string key in completedKeys)
                {
                    sessions.Remove(key);
                }

                lock (SyncRoot)
                {
                    if (!Stopping && !ForceRescan)
                    {
                        Monitor.Wait(SyncRoot, TickIntervalMs);
                    }
                }
            }

            RestoreAllImmediately(sessions);
        }

        public static int Main(string[] args)
        {
            uint selfPid = (uint)Process.GetCurrentProcess().Id;
            var initialPids = new HashSet<uint> { selfPid };

            foreach (string arg in args)
            {
                uint pid;
                if (uint.TryParse(arg, NumberStyles.None, CultureInfo.InvariantCulture, out pid) && pid > 0)
                {
                    initialPids.Add(pid);
                }
                else
                {
                    Console.Error.WriteLine("Invalid PID argument: " + arg);
                    return 1;
                }
            }

            try
            {
                var probe = (IMMDeviceEnumerator)new MMDeviceEnumeratorComObject();
                if (probe == null)
                {
                    Console.Error.WriteLine("WASAPI audio endpoint enumerator unavailable");
                    return 1;
                }
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine("WASAPI initialization failed: " + ex.Message);
                return 1;
            }

            lock (SyncRoot)
            {
                ExplicitExcludedPids = new HashSet<uint>(initialPids);
            }

            var worker = new Thread(RunWorker)
            {
                IsBackground = false,
                Name = "AudioAttenuatorWorker"
            };
            worker.Start();

            Console.CancelKeyPress += (sender, e) =>
            {
                e.Cancel = true;
                lock (SyncRoot)
                {
                    Stopping = true;
                    Monitor.PulseAll(SyncRoot);
                }
            };

            Console.Out.WriteLine("READY");
            Console.Out.Flush();

            string line;
            while ((line = Console.In.ReadLine()) != null)
            {
                line = line.Trim();
                if (line.Length == 0)
                {
                    continue;
                }

                string[] parts = line.Split(new[] { ' ', '\t' }, StringSplitOptions.RemoveEmptyEntries);
                string cmd = parts[0];

                if (cmd == "PING")
                {
                    Console.Out.WriteLine("PONG");
                    Console.Out.Flush();
                }
                else if (cmd == "DUCK")
                {
                    float percent;
                    if (parts.Length >= 2 &&
                        float.TryParse(parts[1], NumberStyles.Float, CultureInfo.InvariantCulture, out percent))
                    {
                        int fadeMs = DefaultDuckFadeMs;
                        if (parts.Length >= 3)
                        {
                            int parsedFade;
                            if (int.TryParse(parts[2], NumberStyles.Integer, CultureInfo.InvariantCulture, out parsedFade))
                            {
                                fadeMs = parsedFade;
                            }
                        }

                        lock (SyncRoot)
                        {
                            DuckAmount = Clamp01(percent / 100.0f);
                            FadeDurationMs = Math.Max(10, fadeMs);
                            IsDucked = DuckAmount > 0.0f;
                            ForceRescan = true;
                            Monitor.PulseAll(SyncRoot);
                        }

                        Console.Out.WriteLine("OK");
                        Console.Out.Flush();
                    }
                    else
                    {
                        Console.Out.WriteLine("ERR invalid DUCK arguments");
                        Console.Out.Flush();
                    }
                }
                else if (cmd == "RESTORE")
                {
                    int fadeMs = DefaultRestoreFadeMs;
                    if (parts.Length >= 2)
                    {
                        int parsedFade;
                        if (int.TryParse(parts[1], NumberStyles.Integer, CultureInfo.InvariantCulture, out parsedFade))
                        {
                            fadeMs = parsedFade;
                        }
                    }

                    lock (SyncRoot)
                    {
                        IsDucked = false;
                        DuckAmount = 0.0f;
                        FadeDurationMs = Math.Max(10, fadeMs);
                        Monitor.PulseAll(SyncRoot);
                    }

                    Console.Out.WriteLine("OK");
                    Console.Out.Flush();
                }
                else if (cmd == "EXCLUDE")
                {
                    var updated = new HashSet<uint>(initialPids);
                    for (int i = 1; i < parts.Length; i++)
                    {
                        uint pid;
                        if (uint.TryParse(parts[i], NumberStyles.None, CultureInfo.InvariantCulture, out pid) && pid > 0)
                        {
                            updated.Add(pid);
                        }
                    }

                    lock (SyncRoot)
                    {
                        ExplicitExcludedPids = updated;
                        Monitor.PulseAll(SyncRoot);
                    }

                    Console.Out.WriteLine("OK");
                    Console.Out.Flush();
                }
                else if (cmd == "QUIT")
                {
                    break;
                }
                else
                {
                    Console.Out.WriteLine("ERR unknown command");
                    Console.Out.Flush();
                }
            }

            lock (SyncRoot)
            {
                Stopping = true;
                Monitor.PulseAll(SyncRoot);
            }

            worker.Join(3000);
            return 0;
        }
    }
}
