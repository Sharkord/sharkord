import { z } from 'zod';
import { IpcChannel } from '../../shared/constants';
import type { TUpdateState } from '../../shared/types';
import { defineIpc } from './define-ipc';
import { handleIpc } from './handle-ipc';
import type { TIpcContext } from './types';

const getUpdateStateCall = defineIpc({
  channel: IpcChannel.GET_UPDATE_STATE,
  args: z.tuple([]),
  result: z.custom<TUpdateState>()
});

const registerGetUpdateState = ({ updater, isShell }: TIpcContext) => {
  handleIpc(getUpdateStateCall, () => updater.getState(), isShell);
};

export { getUpdateStateCall, registerGetUpdateState };
