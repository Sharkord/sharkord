import { z } from 'zod';
import { IpcChannel } from '../../shared/constants';
import { defineIpc } from './define-ipc';
import { handleIpc } from './handle-ipc';
import type { TIpcContext } from './types';

const checkForUpdatesCall = defineIpc({
  channel: IpcChannel.CHECK_FOR_UPDATES,
  args: z.tuple([]),
  result: z.void()
});

const registerCheckForUpdates = ({ updater, isShell }: TIpcContext) => {
  handleIpc(
    checkForUpdatesCall,
    () => {
      updater.check();
    },
    isShell
  );
};

export { checkForUpdatesCall, registerCheckForUpdates };
