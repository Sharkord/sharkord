import { z } from 'zod';
import { BridgeChannel } from '../../shared/bridge-channels';
import { defineIpc } from './define-ipc';
import { handleIpc } from './handle-ipc';
import type { TIpcContext } from './types';

const toggleRailCall = defineIpc({
  channel: BridgeChannel.TOGGLE_RAIL,
  args: z.tuple([]),
  result: z.void()
});

const registerToggleRail = ({ controller }: TIpcContext) => {
  handleIpc(toggleRailCall, () => {
    const { railVisible } = controller.getState();

    controller.setRailHidden(railVisible);
  });
};

export { registerToggleRail, toggleRailCall };
