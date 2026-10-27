import { z } from 'zod';
import { IpcChannel } from '../../shared/constants';
import { defineIpc } from './define-ipc';
import { handleIpc } from './handle-ipc';
import type { TIpcContext } from './types';

const updateSettingsCall = defineIpc({
  channel: IpcChannel.UPDATE_SETTINGS,
  args: z.tuple([
    z
      .strictObject({
        connectAllOnStartup: z.boolean(),
        throttleHiddenServers: z.boolean(),
        autoStart: z.boolean(),
        closeToTray: z.boolean(),
        startToTray: z.boolean(),
        dynamicTrayIcon: z.boolean(),
        autoUpdate: z.boolean()
      })
      .partial()
  ]),
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
