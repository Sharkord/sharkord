import { DESKTOP_PROTOCOL } from '@sharkord/shared';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import os from 'os';
import path from 'path';
import { APP_ID } from '../../shared/constants';
import { getDesktopExec } from './get-launch-command';

const getDesktopEntryPath = () => {
  const dataDir =
    process.env.XDG_DATA_HOME ?? path.join(os.homedir(), '.local', 'share');

  return path.join(dataDir, 'applications', `${APP_ID}.desktop`);
};

const writeDesktopEntry = (iconPath: string) => {
  if (process.platform !== 'linux') {
    return;
  }

  const file = getDesktopEntryPath();
  const content = [
    '[Desktop Entry]',
    'Type=Application',
    'Name=Sharkord',
    `Exec=${getDesktopExec()} %u`,
    `Icon=${iconPath}`,
    'NoDisplay=true',
    `MimeType=x-scheme-handler/${DESKTOP_PROTOCOL};`,
    ''
  ].join('\n');

  try {
    if (readFileSync(file, 'utf8') === content) {
      return;
    }
  } catch {
    // missing, written below
  }

  try {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, content);
  } catch (error) {
    console.error('failed to write the desktop entry', error);
  }
};

export { writeDesktopEntry };
