import { z } from 'zod';

// no .default() here: zod 4 applies defaults inside .partial() too, which would turn every
// settings patch into a reset of the keys it left out
const desktopSettingsSchema = z.strictObject({
  connectAllOnStartup: z.boolean(),
  throttleHiddenServers: z.boolean(),
  autoStart: z.boolean(),
  closeToTray: z.boolean(),
  startToTray: z.boolean(),
  dynamicTrayIcon: z.boolean(),
  autoUpdate: z.boolean()
});

type TDesktopSettings = z.infer<typeof desktopSettingsSchema>;

const DEFAULT_SETTINGS: TDesktopSettings = {
  connectAllOnStartup: false,
  throttleHiddenServers: true,
  autoStart: false,
  closeToTray: true,
  startToTray: false,
  dynamicTrayIcon: true,
  autoUpdate: true
};

export { DEFAULT_SETTINGS, desktopSettingsSchema };
export type { TDesktopSettings };
