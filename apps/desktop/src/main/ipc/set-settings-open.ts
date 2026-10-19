import { z } from 'zod';
import { IpcChannel } from '../../shared/constants';
import { defineIpc } from './define-ipc';
import { handleIpc } from './handle-ipc';
import type { TIpcContext } from './types';

const setSettingsOpenCall = defineIpc({
  channel: IpcChannel.SET_SETTINGS_OPEN,
  args: z.tuple([z.boolean()]),
  result: z.void()
});

const registerSetSettingsOpen = ({ controller, isShell }: TIpcContext) => {
  handleIpc(
    setSettingsOpenCall,
    (open) => {
      controller.setSettingsOpen(open);
    },
    isShell
  );
};

export { registerSetSettingsOpen, setSettingsOpenCall };
