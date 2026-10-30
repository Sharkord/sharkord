import { z } from 'zod';
import { IpcChannel } from '../../shared/constants';
import { defineIpc } from './define-ipc';
import { handleIpc } from './handle-ipc';
import type { TIpcContext } from './types';

const installUpdateCall = defineIpc({
  channel: IpcChannel.INSTALL_UPDATE,
  args: z.tuple([]),
  result: z.void()
});

const registerInstallUpdate = ({ updater, isShell }: TIpcContext) => {
  handleIpc(
    installUpdateCall,
    () => {
      updater.install();
    },
    isShell
  );
};

export { installUpdateCall, registerInstallUpdate };
