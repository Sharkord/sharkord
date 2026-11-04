import { app } from 'electron';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import os from 'os';
import path from 'path';
import { createLogger } from '../logs/logger';
import { getDesktopExec } from './get-launch-command';

const logger = createLogger('auto-start');

const AUTOSTART_FLAG = '--autostart';

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
      `Exec=${getDesktopExec()} ${AUTOSTART_FLAG}`,
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

      logger.info('auto start updated', { enabled });

      return;
    }

    app.setLoginItemSettings({ openAtLogin: enabled, args: [AUTOSTART_FLAG] });

    logger.info('auto start updated', { enabled });
  } catch (error) {
    logger.error('failed to update auto start', error);
  }
};

const wasLaunchedAtLogin = () => process.argv.includes(AUTOSTART_FLAG);

export { setAutoStart, wasLaunchedAtLogin };
