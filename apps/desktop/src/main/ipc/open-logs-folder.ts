import { z } from 'zod';
import { IpcChannel } from '../../shared/constants';
import { defineIpc } from './define-ipc';
import { handleIpc } from './handle-ipc';
import type { TIpcContext } from './types';

const openLogsFolderCall = defineIpc({
  channel: IpcChannel.OPEN_LOGS_FOLDER,
  args: z.tuple([]),
  result: z.void()
});

const registerOpenLogsFolder = ({ openLogsFolder, isShell }: TIpcContext) => {
  handleIpc(openLogsFolderCall, () => openLogsFolder(), isShell);
};

export { openLogsFolderCall, registerOpenLogsFolder };
