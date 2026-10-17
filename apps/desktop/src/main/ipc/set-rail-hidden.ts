import { z } from 'zod';
import { IpcChannel } from '../../shared/constants';
import { defineIpc } from './define-ipc';
import { handleIpc } from './handle-ipc';
import type { TIpcContext } from './types';

const setRailHiddenCall = defineIpc({
  channel: IpcChannel.SET_RAIL_HIDDEN,
  args: z.tuple([z.boolean()]),
  result: z.void()
});

const registerSetRailHidden = ({ controller, isShell }: TIpcContext) => {
  handleIpc(
    setRailHiddenCall,
    (hidden) => {
      controller.setRailHidden(hidden);
    },
    isShell
  );
};

export { registerSetRailHidden, setRailHiddenCall };
