import type { BrowserWindow } from 'electron';
import type { TServer } from '../../shared/types';
import { showConfirmDialog } from '../dialogs/show-confirm-dialog';
import { i18n } from '../i18n';
import type { TServerController } from './server-controller';

const pending = new Map<string, Promise<boolean>>();

const askMediaAccess = async (
  win: BrowserWindow,
  controller: TServerController,
  server: TServer
) => {
  try {
    const isAllowed = await showConfirmDialog(win, {
      type: 'question',
      message: i18n.t('mediaDialog.title', { name: server.name }),
      detail: i18n.t('mediaDialog.message', { name: server.name }),
      confirmLabel: i18n.t('mediaDialog.allow'),
      cancelLabel: i18n.t('mediaDialog.deny'),
      focusConfirm: true
    });

    if (isAllowed) {
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
