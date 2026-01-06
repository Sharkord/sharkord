import type { TDeviceSettings } from '@/types';

export enum ServerScreen {
  SERVER_SETTINGS = 'SERVER_SETTINGS',
  CHANNEL_SETTINGS = 'CHANNEL_SETTINGS',
  CATEGORY_SETTINGS = 'CATEGORY_SETTINGS',
  USER_SETTINGS = 'USER_SETTINGS'
}

export type TServerScreenBaseProps = {
  close: () => void;
  isOpen: boolean;
  // hack to pass context data to the screens inside portals
  devices: TDeviceSettings;
  saveDevices: (devices: TDeviceSettings) => void;
};
