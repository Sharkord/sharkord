import { dialog, type BrowserWindow } from 'electron';
import type { TServer } from '../../shared/types';
import { i18n } from '../i18n';
import type { TServerController } from './server-controller';

const confirmRemoveServer = async (
  win: BrowserWindow,
  controller: TServerController,
  server: TServer
) => {
  const confirmLabel = i18n.t('removeDialog.confirm');
  const cancelLabel = i18n.t('removeDialog.cancel');

  const { response } = await dialog.showMessageBox(win, {
    type: 'warning',
    buttons: [confirmLabel, cancelLabel],
    defaultId: 1,
    cancelId: 1,
    message: i18n.t('removeDialog.title'),
    detail: i18n.t('removeDialog.message', { name: server.name })
  });

  if (response === 0) {
    controller.remove(server.id);
  }
};

export { confirmRemoveServer };
