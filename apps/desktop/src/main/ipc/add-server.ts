import { z } from 'zod';
import { IpcChannel } from '../../shared/constants';
import type { TAddServerError } from '../../shared/types';
import { defineIpc } from './define-ipc';
import { handleIpc } from './handle-ipc';
import type { TIpcContext } from './types';

const MAX_SERVER_ADDRESS_LENGTH = 2048;

const addServerCall = defineIpc({
  channel: IpcChannel.ADD_SERVER,
  args: z.tuple([z.string().max(MAX_SERVER_ADDRESS_LENGTH)]),
  result: z.custom<TAddServerError | null>()
});

const registerAddServer = ({ controller }: TIpcContext) => {
  handleIpc(addServerCall, (input) => controller.add(input));
};

export { addServerCall, registerAddServer };
