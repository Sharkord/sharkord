import { z } from 'zod';
import { IpcChannel } from '../../shared/constants';
import type { TServersState } from '../../shared/types';
import { defineIpc } from './define-ipc';
import { handleIpc } from './handle-ipc';
import type { TIpcContext } from './types';

const getStateCall = defineIpc({
  channel: IpcChannel.GET_STATE,
  args: z.tuple([]),
  result: z.custom<TServersState>()
});

const registerGetState = ({ controller }: TIpcContext) => {
  handleIpc(getStateCall, () => controller.getState());
};

export { getStateCall, registerGetState };
