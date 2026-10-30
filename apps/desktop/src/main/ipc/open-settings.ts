import { z } from 'zod';
import { BridgeChannel } from '../../shared/bridge-channels';
import { defineIpc } from './define-ipc';
import { anySender, handleIpc } from './handle-ipc';
import type { TIpcContext } from './types';

const openSettingsCall = defineIpc({
  channel: BridgeChannel.OPEN_SETTINGS,
  args: z.tuple([]),
  result: z.void()
});

const registerOpenSettings = ({ controller }: TIpcContext) => {
  handleIpc(
    openSettingsCall,
    () => {
      controller.setSettingsOpen(true);
    },
    anySender
  );
};

export { openSettingsCall, registerOpenSettings };
