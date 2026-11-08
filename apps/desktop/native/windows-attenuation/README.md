# Windows Audio Attenuation Helper

Provides Discord/Mumble-style system audio attenuation (ducking) for Sharkord Desktop on Windows using WASAPI (`IMMDeviceEnumerator`, `IAudioSessionManager2`, `IAudioSessionEnumerator`, `IAudioSessionControl2`, `ISimpleAudioVolume`).

## Protocol (stdio)

The helper prints `READY` once COM and the WASAPI device enumerator are initialized, then reads line-delimited commands from `stdin`:

- `EXCLUDE <pid1> [pid2 ...]` — sets the root/explicit process IDs to exclude from ducking (all descendant processes in the process tree are also excluded automatically).
- `DUCK <percent> [fadeMs]` — smoothly attenuates other active audio sessions by `<percent>%` (`0`–`100`) over `<fadeMs>` milliseconds (default `150`ms).
- `RESTORE [fadeMs]` — smoothly restores all attenuated sessions back to their baseline volume over `<fadeMs>` milliseconds (default `200`ms).
- `PING` — responds with `PONG`.
- `QUIT` — immediately restores all tracked sessions to their baseline volume and exits with code `0`.

If `stdin` closes (for example, if the parent Electron process exits or crashes), all tracked sessions are immediately restored to their baseline volume before the helper exits.
