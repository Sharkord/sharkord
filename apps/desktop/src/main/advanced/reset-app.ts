import { app, session, type BrowserWindow } from 'electron';
import { rmSync } from 'fs';
import { showConfirmDialog } from '../dialogs/show-confirm-dialog';
import { i18n } from '../i18n';
import { createLogger } from '../logs/logger';
import type { TServerController } from '../servers/server-controller';
import { getPartition } from '../views/server-views';

const RESET_FLAG = '--reset-app-data';

const logger = createLogger('reset-app');

// runs before electron opens its own files, a file that cannot be deleted is left behind
const wipeUserDataIfRequested = () => {
  if (!process.argv.includes(RESET_FLAG)) {
    return;
  }

  try {
    rmSync(app.getPath('userData'), { recursive: true, force: true });
  } catch (error) {
    // not the file logger, it is not set up yet and its file is in the folder being wiped
    console.error(error);
  }
};

const confirmAndResetApp = async (
  win: BrowserWindow,
  controller: TServerController
) => {
  const isConfirmed = await showConfirmDialog(win, {
    type: 'warning',
    message: i18n.t('resetDialog.title'),
    detail: i18n.t('resetDialog.message'),
    confirmLabel: i18n.t('resetDialog.confirm'),
    cancelLabel: i18n.t('resetDialog.cancel')
  });

  if (!isConfirmed) {
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

  logger.info('resetting the app data and relaunching');

  const args = process.argv.slice(1).filter((arg) => arg !== RESET_FLAG);

  app.relaunch({ args: [...args, RESET_FLAG] });
  app.exit(0);
};

export { confirmAndResetApp, wipeUserDataIfRequested };
