export enum ServerScreen {
  SERVER_SETTINGS = 'SERVER_SETTINGS',
  CHANNEL_SETTINGS = 'CHANNEL_SETTINGS',
  CATEGORY_SETTINGS = 'CATEGORY_SETTINGS',
  USER_SETTINGS = 'USER_SETTINGS'
}

export type TServerScreenBaseProps = {
  close: () => void;
  isOpen: boolean;
};
