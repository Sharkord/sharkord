import { z } from 'zod';
import { IpcChannel } from '../../shared/constants';
import { defineIpc } from './define-ipc';
import { handleIpc } from './handle-ipc';
import type { TIpcContext } from './types';

const selectServerCall = defineIpc({
  channel: IpcChannel.SELECT_SERVER,
  args: z.tuple([z.string()]),
  result: z.void()
});

const registerSelectServer = ({ controller }: TIpcContext) => {
  handleIpc(selectServerCall, (id) => {
    controller.select(id);
  });
};

export { registerSelectServer, selectServerCall };
