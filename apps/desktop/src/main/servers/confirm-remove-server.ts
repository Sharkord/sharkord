import type { TDesktopConfirmOptions } from '@sharkord/shared';
import { dialog, type BrowserWindow } from 'electron';
import type { TServer } from '../../shared/types';
import { i18n } from '../i18n';
import type { TServerController } from './server-controller';

const confirmRemoveServer = async (
  win: BrowserWindow,
  controller: TServerController,
  server: TServer
) => {
  const title = i18n.t('removeDialog.title');
  const message = i18n.t('removeDialog.message', { name: server.name });
  const confirmLabel = i18n.t('removeDialog.confirm');
  const cancelLabel = i18n.t('removeDialog.cancel');

  const options: TDesktopConfirmOptions = {
    title,
    message,
    confirmLabel,
    cancelLabel,
    variant: 'danger'
  };

  let answer = await controller.confirm(options);

  if (answer === null) {
    const { response } = await dialog.showMessageBox(win, {
      type: 'warning',
      buttons: [confirmLabel, cancelLabel],
      defaultId: 1,
      cancelId: 1,
      message: title,
      detail: message
    });

    answer = response === 0;
  }

  if (answer) {
    controller.remove(server.id);
  }
};

export { confirmRemoveServer };
