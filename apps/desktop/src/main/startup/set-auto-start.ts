import { app } from 'electron';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import os from 'os';
import path from 'path';

const getLinuxAutostartFile = () => {
  const configDir =
    process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), '.config');

  return path.join(configDir, 'autostart', 'sharkord.desktop');
};

// electron has no login items on linux, the desktop session reads xdg autostart entries instead
const setLinuxAutoStart = (enabled: boolean) => {
  const file = getLinuxAutostartFile();

  if (!enabled) {
    rmSync(file, { force: true });

    return;
  }

  // an appimage runs from a temporary mount, the os has to start the image itself
  const executable = process.env.APPIMAGE ?? process.execPath;

  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(
    file,
    [
      '[Desktop Entry]',
      'Type=Application',
      'Name=Sharkord',
      `Exec="${executable}"`,
      'X-GNOME-Autostart-enabled=true',
      ''
    ].join('\n')
  );
};

const setAutoStart = (enabled: boolean) => {
  if (!app.isPackaged) {
    return;
  }

  try {
    if (process.platform === 'linux') {
      setLinuxAutoStart(enabled);

      return;
    }

    app.setLoginItemSettings({ openAtLogin: enabled });
  } catch (error) {
    console.error('failed to update auto start', error);
  }
};

export { setAutoStart };
