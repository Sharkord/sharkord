import { z } from 'zod';
import { IpcChannel } from '../../shared/constants';
import { desktopSettingsSchema } from '../../shared/desktop-settings';
import { defineIpc } from './define-ipc';
import { handleIpc } from './handle-ipc';
import type { TIpcContext } from './types';

const updateSettingsCall = defineIpc({
  channel: IpcChannel.UPDATE_SETTINGS,
  args: z.tuple([desktopSettingsSchema.partial()]),
  result: z.void()
});

const registerUpdateSettings = ({ controller, isShell }: TIpcContext) => {
  handleIpc(
    updateSettingsCall,
    (settings) => {
      controller.updateSettings(settings);
    },
    isShell
  );
};

export { registerUpdateSettings, updateSettingsCall };
