import { z } from 'zod';
import { IpcChannel } from '../../shared/constants';
import { defineIpc } from './define-ipc';
import { handleIpc } from './handle-ipc';
import type { TIpcContext } from './types';

const setAddingCall = defineIpc({
  channel: IpcChannel.SET_ADDING,
  args: z.tuple([z.boolean()]),
  result: z.void()
});

const registerSetAdding = ({ controller, isShell }: TIpcContext) => {
  handleIpc(
    setAddingCall,
    (adding) => {
      controller.setAdding(adding);
    },
    isShell
  );
};

export { registerSetAdding, setAddingCall };
