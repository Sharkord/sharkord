export enum PluginSlot {
  CONNECT_SCREEN = 'connect_screen',
  HOME_SCREEN = 'home_screen',
  CHAT_ACTIONS = 'chat_actions',
  TOPBAR_RIGHT = 'topbar_right',
  FULL_SCREEN = 'full_screen'
}

export type TPluginReactComponent = React.ComponentType;

export type TPluginComponentsMapBySlotId = {
  [slot in PluginSlot]?: TPluginReactComponent[];
};

export type TPluginComponentsMap = {
  [pluginId: string]: TPluginComponentsMapBySlotId;
};
