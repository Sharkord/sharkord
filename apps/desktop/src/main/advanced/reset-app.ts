import { app, dialog, session, type BrowserWindow } from 'electron';
import { rmSync } from 'fs';
import { i18n } from '../i18n';
import type { TServerController } from '../servers/server-controller';
import { getPartition } from '../views/server-views';

const RESET_FLAG = '--reset-app-data';

// runs before electron opens its own files, a file that cannot be deleted is left behind
const wipeUserDataIfRequested = () => {
  if (!process.argv.includes(RESET_FLAG)) {
    return;
  }

  try {
    rmSync(app.getPath('userData'), { recursive: true, force: true });
  } catch (error) {
    console.error(error);
  }
};

const confirmAndResetApp = async (
  win: BrowserWindow,
  controller: TServerController
) => {
  const { response } = await dialog.showMessageBox(win, {
    type: 'warning',
    buttons: [i18n.t('resetDialog.confirm'), i18n.t('resetDialog.cancel')],
    defaultId: 1,
    cancelId: 1,
    message: i18n.t('resetDialog.title'),
    detail: i18n.t('resetDialog.message')
  });

  if (response !== 0) {
    return;
  }

  const { servers } = controller.getState();

  const sessions = [
    session.defaultSession,
    ...servers.map((server) => session.fromPartition(getPartition(server.id)))
  ];

  // cleared while the app runs so nothing survives even if the files below stay locked
  await Promise.all(
    sessions.map(async (appSession) => {
      await appSession.clearStorageData();
      await appSession.clearCache();
      await appSession.clearAuthCache();
    })
  );

  const args = process.argv.slice(1).filter((arg) => arg !== RESET_FLAG);

  app.relaunch({ args: [...args, RESET_FLAG] });
  app.exit(0);
};

export { confirmAndResetApp, wipeUserDataIfRequested };
