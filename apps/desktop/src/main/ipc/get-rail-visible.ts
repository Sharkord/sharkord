import { z } from 'zod';
import { BridgeChannel } from '../../shared/bridge-channels';
import { defineIpc } from './define-ipc';
import { anySender, handleIpc } from './handle-ipc';
import type { TIpcContext } from './types';

const getRailVisibleCall = defineIpc({
  channel: BridgeChannel.GET_RAIL_VISIBLE,
  args: z.tuple([]),
  result: z.boolean()
});

const registerGetRailVisible = ({ controller }: TIpcContext) => {
  handleIpc(
    getRailVisibleCall,
    () => {
      const { railVisible } = controller.getState();

      return railVisible;
    },
    anySender
  );
};

export { getRailVisibleCall, registerGetRailVisible };
