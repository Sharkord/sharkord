# Windows window audio

Issue: https://github.com/Sharkord/sharkord/issues/925

The helper captures the process tree owning the window chosen in the desktop
picker with WASAPI process loopback. It runs outside Electron so the UI never
blocks on COM activation or audio capture. No audio driver or native Node addon
is installed. Whole-screen sharing retains Electron's system loopback. macOS and
Linux keep their existing capture paths.

Requires Windows build 20348 or later (Windows 11 for consumer editions). The
current desktop Windows release and this helper target x64. Build with Visual
Studio C++ Build Tools and a current Windows SDK:

```powershell
node native/windows-audio/build.cjs
node --test native/windows-audio/test.cjs
```

`dev`, `build`, and `package` build the helper automatically on Windows. The
Windows package places it in the Electron resources directory. Building the
Windows package on Linux or macOS is not supported by this helper build step.

The helper takes a decimal HWND, resolves the PID itself, and includes only that
process tree. Legacy UWP host windows resolve through their CoreWindow child.
There is no arbitrary PID parameter in the renderer bridge. The main process
accepts one start per approved audio-enabled capture, within 15 seconds of the
picker approval. Missing helpers, unsupported Windows versions, vanished
windows, and activation failures result in window sharing without audio, never
system loopback. The existing screen-share note documents this behavior in every
supported locale.

Stdout begins with `SAUDIO1\n`, followed by interleaved little-endian float32
stereo PCM at 48 kHz. Diagnostics go to stderr. Closing stdin stops capture;
closing the selected window also exits. The main process terminates the helper
on stop, navigation, renderer termination, destruction, or a new capture. The
client forwards PCM to a bounded AudioWorklet ring buffer connected only to a
MediaStreamAudioDestinationNode, never local speakers.

This is application audio, not isolated tab or HWND audio. Multiple windows of
one application, including browser windows, can share an audio process tree.
Applications with audio services outside their process tree require separate
compatibility testing.

The bridge version is 2. Both the desktop app and the server's web client must
be built from this change. Older counterparts use the existing mismatch
behavior. No server media routing change is required.

Validation:

- Native x64 build on Windows build 26200.
- Two simultaneous synthetic sources (440 Hz and 880 Hz), each in a separate
  process with a real HWND. Each helper capture contains its selected tone and
  suppresses the other by more than the 40 dB acceptance threshold.
- Stereo ordering, underrun silence, cross-packet continuity, and bounded
  overflow are covered in `window-audio-processor.test.ts`.
- `test.cjs` reproduces process isolation with two quiet synthetic tones and
  tests invalid HWNDs and stopping on stdin close. It requires an active Windows
  audio session. CI builds the helper and runs only the invalid-target test
  because hosted runners may have no audio endpoint.

Before release, verify a real application and a second audio source with a
remote viewer; full-screen audio; audio disabled; closing the shared window;
stopping and starting again; reload/crash cleanup; and unsupported Windows
behavior. A synthetic native test does not replace this end-to-end acceptance.

API references:

- https://learn.microsoft.com/en-us/windows/win32/api/audioclientactivationparams/ns-audioclientactivationparams-audioclient_process_loopback_params
- https://learn.microsoft.com/en-us/samples/microsoft/windows-classic-samples/applicationloopbackaudio-sample/
- https://github.com/electron/electron/issues/54628
