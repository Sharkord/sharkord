import { z } from 'zod';
import { IpcChannel } from '../../shared/constants';
import { defineIpc } from './define-ipc';
import { handleIpc } from './handle-ipc';
import type { TIpcContext } from './types';

const downloadUpdateCall = defineIpc({
  channel: IpcChannel.DOWNLOAD_UPDATE,
  args: z.tuple([]),
  result: z.void()
});

const registerDownloadUpdate = ({ updater, isShell }: TIpcContext) => {
  handleIpc(
    downloadUpdateCall,
    () => {
      updater.download();
    },
    isShell
  );
};

export { downloadUpdateCall, registerDownloadUpdate };
