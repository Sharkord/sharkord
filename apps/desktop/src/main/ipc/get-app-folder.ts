import { z } from 'zod';
import { IpcChannel } from '../../shared/constants';
import { defineIpc } from './define-ipc';
import { handleIpc } from './handle-ipc';
import type { TIpcContext } from './types';

const getAppFolderCall = defineIpc({
  channel: IpcChannel.GET_APP_FOLDER,
  args: z.tuple([]),
  result: z.string()
});

const registerGetAppFolder = ({ getAppFolder, isShell }: TIpcContext) => {
  handleIpc(getAppFolderCall, () => getAppFolder(), isShell);
};

export { getAppFolderCall, registerGetAppFolder };
