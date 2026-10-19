import { app } from 'electron';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import os from 'os';
import path from 'path';
import { getDesktopExec } from './get-launch-command';

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

  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(
    file,
    [
      '[Desktop Entry]',
      'Type=Application',
      'Name=Sharkord',
      `Exec=${getDesktopExec()}`,
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
