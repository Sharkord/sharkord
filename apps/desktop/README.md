# Sharkord Desktop

Electron shell around Sharkord servers. Each server is loaded from its own host
in an isolated session, so it always runs the client version that server ships.
See [DEVELOPMENT.md](../../DEVELOPMENT.md) for running it and for how desktop
releases work.

## Packaging locally

| Script                      | Builds                                 |
| --------------------------- | -------------------------------------- |
| `bun run package:dev`       | the platform you are on                |
| `bun run package:dev-linux` | Linux AppImage                         |
| `bun run package:dev-win`   | Windows installer, needs Wine on Linux |
| `bun run package:dev-mac`   | macOS dmg and zip, only works on macOS |

None of them publish anything. The output goes to `dist/`.

### User data

Holds `servers.json` (the server list, the selected server, whether the server
list is hidden and the desktop settings), `Partitions/server-<id>/` (each
server's isolated session: its login, cookies and local storage) and Chromium's
caches and crash reports.

| Platform | Location                                     |
| -------- | -------------------------------------------- |
| Linux    | `~/.config/sharkord-app`                     |
| Windows  | `%APPDATA%\sharkord-app`                     |
| macOS    | `~/Library/Application Support/sharkord-app` |

On Linux `~/.config` follows `XDG_CONFIG_HOME` when it is set.

Quit the app and delete this folder to reset it.

### Downloaded updates

Packaged builds only, written by the auto updater.

| Platform | Location                                                                                   |
| -------- | ------------------------------------------------------------------------------------------ |
| Linux    | `~/.cache/sharkord-app-updater`                                                            |
| Windows  | `%LOCALAPPDATA%\sharkord-app-updater`                                                      |
| macOS    | `~/Library/Caches/sharkord-app-updater` and `~/Library/Caches/com.sharkord.desktop.ShipIt` |

### Installed app

| Platform | Location                                                                                                            |
| -------- | ------------------------------------------------------------------------------------------------------------------- |
| Linux    | wherever the AppImage was saved. While it runs it is mounted read-only under `/tmp/.mount_Sharko…`                  |
| Windows  | `%LOCALAPPDATA%\Programs\Sharkord`, with a Start menu shortcut in `%APPDATA%\Microsoft\Windows\Start Menu\Programs` |
| macOS    | wherever `Sharkord.app` was dragged to, usually `/Applications`                                                     |

### Integration with the system

| Platform | What                                         | Location                                                                    |
| -------- | -------------------------------------------- | --------------------------------------------------------------------------- |
| Linux    | launcher entry, icon and `sharkord://` links | `~/.local/share/applications/com.sharkord.desktop.desktop`                  |
| Linux    | default handler for `sharkord://`            | `~/.config/mimeapps.list`                                                   |
| Linux    | open on startup                              | `~/.config/autostart/sharkord.desktop`                                      |
| Windows  | `sharkord://` handler                        | registry, `HKEY_CURRENT_USER\Software\Classes\sharkord`                     |
| Windows  | open on startup                              | registry, `HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run` |
| macOS    | `sharkord://` handler                        | the app bundle's `Info.plist`, read by Launch Services                      |
| macOS    | open on startup                              | System Settings, General, Login Items                                       |

On Linux `~/.local/share` follows `XDG_DATA_HOME` when it is set. The launcher
entry is written on every start, the autostart entry only while "Open on
startup" is on, and only by packaged builds.
