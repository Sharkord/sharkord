import { z } from 'zod';
import { IpcChannel } from '../../shared/constants';
import { defineIpc } from './define-ipc';
import { handleIpc } from './handle-ipc';
import type { TIpcContext } from './types';

const removeServerCall = defineIpc({
  channel: IpcChannel.REMOVE_SERVER,
  args: z.tuple([z.string()]),
  result: z.void()
});

const registerRemoveServer = ({ controller, requestRemove }: TIpcContext) => {
  handleIpc(removeServerCall, async (id) => {
    const { servers } = controller.getState();
    const server = servers.find((candidate) => candidate.id === id);

    if (server) {
      await requestRemove(server);
    }
  });
};

export { registerRemoveServer, removeServerCall };
