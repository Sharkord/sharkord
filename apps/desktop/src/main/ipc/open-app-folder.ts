import { z } from 'zod';
import { IpcChannel } from '../../shared/constants';
import { defineIpc } from './define-ipc';
import { handleIpc } from './handle-ipc';
import type { TIpcContext } from './types';

const openAppFolderCall = defineIpc({
  channel: IpcChannel.OPEN_APP_FOLDER,
  args: z.tuple([]),
  result: z.void()
});

const registerOpenAppFolder = ({ openAppFolder, isShell }: TIpcContext) => {
  handleIpc(openAppFolderCall, () => openAppFolder(), isShell);
};

export { openAppFolderCall, registerOpenAppFolder };
