import { z } from 'zod';
import { IpcChannel } from '../../shared/constants';
import { defineIpc } from './define-ipc';
import { handleIpc } from './handle-ipc';
import type { TIpcContext } from './types';

const getLogsFolderCall = defineIpc({
  channel: IpcChannel.GET_LOGS_FOLDER,
  args: z.tuple([]),
  result: z.string()
});

const registerGetLogsFolder = ({ getLogsFolder, isShell }: TIpcContext) => {
  handleIpc(getLogsFolderCall, () => getLogsFolder(), isShell);
};

export { getLogsFolderCall, registerGetLogsFolder };
