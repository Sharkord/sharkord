import type { BrowserWindow } from 'electron';
import type { TServer } from '../../shared/types';
import { showConfirmDialog } from '../dialogs/show-confirm-dialog';
import { i18n } from '../i18n';
import type { TServerController } from './server-controller';

const confirmRemoveServer = async (
  win: BrowserWindow,
  controller: TServerController,
  server: TServer
) => {
  const isConfirmed = await showConfirmDialog(win, {
    type: 'warning',
    message: i18n.t('removeDialog.title'),
    detail: i18n.t('removeDialog.message', { name: server.name }),
    confirmLabel: i18n.t('removeDialog.confirm'),
    cancelLabel: i18n.t('removeDialog.cancel')
  });

  if (isConfirmed) {
    controller.remove(server.id);
  }
};

export { confirmRemoveServer };
