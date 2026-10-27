import { dialog, type BrowserWindow } from 'electron';
import type { TServer } from '../../shared/types';
import { i18n } from '../i18n';
import type { TServerController } from './server-controller';

const pending = new Map<string, Promise<boolean>>();

const askMediaAccess = async (
  win: BrowserWindow,
  controller: TServerController,
  server: TServer
) => {
  const allowLabel = i18n.t('mediaDialog.allow');
  const denyLabel = i18n.t('mediaDialog.deny');

  try {
    const { response } = await dialog.showMessageBox(win, {
      type: 'question',
      buttons: [allowLabel, denyLabel],
      defaultId: 0,
      cancelId: 1,
      message: i18n.t('mediaDialog.title', { name: server.name }),
      detail: i18n.t('mediaDialog.message', { name: server.name })
    });

    if (response === 0) {
      controller.allowMedia(server.id);

      return true;
    }

    return false;
  } finally {
    pending.delete(server.id);
  }
};

const confirmMediaAccess = (
  win: BrowserWindow,
  controller: TServerController,
  server: TServer
) => {
  if (controller.isMediaAllowed(server.id)) {
    return Promise.resolve(true);
  }

  let request = pending.get(server.id);

  if (!request) {
    request = askMediaAccess(win, controller, server);

    pending.set(server.id, request);
  }

  return request;
};

export { confirmMediaAccess };
