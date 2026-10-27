import { DESKTOP_PROTOCOL } from '@sharkord/shared';
import { app, nativeImage } from 'electron';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import os from 'os';
import path from 'path';
import { APP_ID } from '../../shared/constants';
import { getDesktopExec } from './get-launch-command';

const ICON_SIZE = 512;

const getDataDir = () =>
  process.env.XDG_DATA_HOME ?? path.join(os.homedir(), '.local', 'share');

const writeIfChanged = (file: string, content: string | Buffer) => {
  try {
    const current = readFileSync(file);

    if (current.equals(Buffer.from(content))) {
      return;
    }
  } catch {
    // missing, written below
  }

  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
};

const installIcon = (iconPath: string) => {
  const source = nativeImage.createFromPath(iconPath);
  const resized = source.resize({ width: ICON_SIZE, height: ICON_SIZE });
  const size = `${ICON_SIZE}x${ICON_SIZE}`;

  writeIfChanged(
    path.join(getDataDir(), 'icons', 'hicolor', size, 'apps', `${APP_ID}.png`),
    resized.toPNG()
  );
};

const writeDesktopEntry = (iconPath: string) => {
  if (process.platform !== 'linux') {
    return;
  }

  if (app.isPackaged && !process.env.APPIMAGE) {
    return;
  }

  const content = [
    '[Desktop Entry]',
    'Type=Application',
    'Name=Sharkord',
    `Exec=${getDesktopExec()} %u`,
    `Icon=${APP_ID}`,
    'NoDisplay=true',
    `MimeType=x-scheme-handler/${DESKTOP_PROTOCOL};`,
    ''
  ].join('\n');

  try {
    installIcon(iconPath);
    writeIfChanged(
      path.join(getDataDir(), 'applications', `${APP_ID}.desktop`),
      content
    );
  } catch (error) {
    console.error('failed to write the desktop entry', error);
  }
};

export { writeDesktopEntry };
