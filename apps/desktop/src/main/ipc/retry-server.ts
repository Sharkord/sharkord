import { z } from 'zod';
import { IpcChannel } from '../../shared/constants';
import { defineIpc } from './define-ipc';
import { handleIpc } from './handle-ipc';
import type { TIpcContext } from './types';

const retryServerCall = defineIpc({
  channel: IpcChannel.RETRY_SERVER,
  args: z.tuple([z.string()]),
  result: z.void()
});

const registerRetryServer = ({ controller, isShell }: TIpcContext) => {
  handleIpc(
    retryServerCall,
    (id) => {
      controller.retry(id);
    },
    isShell
  );
};

export { registerRetryServer, retryServerCall };
