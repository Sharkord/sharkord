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

export type TPluginTab = {
  id: string;
  label: string;
  component: TPluginReactComponent;
};

/** what a plugin annotates its `tabs` export with */
export type TPluginTabs = TPluginTab[];

export type TPluginTabsMap = {
  [pluginId: string]: TPluginTab[];
};

export const RESERVED_PLUGIN_TAB_IDS = ['settings', 'commands', 'logs'];

const isRenderableComponent = (value: unknown) =>
  typeof value === 'function' ||
  (typeof value === 'object' && value !== null && '$$typeof' in value);

const isValidPluginTab = (tab: unknown): tab is TPluginTab => {
  if (!tab || typeof tab !== 'object') return false;

  const { id, label, component } = tab as Partial<TPluginTab>;

  return (
    typeof id === 'string' &&
    id.length > 0 &&
    typeof label === 'string' &&
    label.length > 0 &&
    isRenderableComponent(component)
  );
};

export const parsePluginTabs = (value: unknown): TPluginTab[] => {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>(RESERVED_PLUGIN_TAB_IDS);

  return value.filter((tab): tab is TPluginTab => {
    if (!isValidPluginTab(tab) || seen.has(tab.id)) return false;

    seen.add(tab.id);

    return true;
  });
};
