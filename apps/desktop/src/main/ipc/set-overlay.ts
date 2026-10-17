import { z } from 'zod';
import { IpcChannel } from '../../shared/constants';
import { defineIpc } from './define-ipc';
import { handleIpc } from './handle-ipc';
import type { TIpcContext } from './types';

const setOverlayCall = defineIpc({
  channel: IpcChannel.SET_OVERLAY,
  args: z.tuple([z.boolean()]),
  result: z.void()
});

const registerSetOverlay = ({ controller }: TIpcContext) => {
  handleIpc(setOverlayCall, (open) => {
    controller.setOverlay(open);
  });
};

export { registerSetOverlay, setOverlayCall };
