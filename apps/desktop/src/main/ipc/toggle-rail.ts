import { z } from 'zod';
import { BridgeChannel } from '../../shared/bridge-channels';
import { defineIpc } from './define-ipc';
import { anySender, handleIpc } from './handle-ipc';
import type { TIpcContext } from './types';

const toggleRailCall = defineIpc({
  channel: BridgeChannel.TOGGLE_RAIL,
  args: z.tuple([]),
  result: z.void()
});

const registerToggleRail = ({ controller }: TIpcContext) => {
  handleIpc(
    toggleRailCall,
    () => {
      controller.toggleRail();
    },
    anySender
  );
};

export { registerToggleRail, toggleRailCall };
