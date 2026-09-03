import type { Permission } from '../statics/permissions';

/**
 * Where in the client a plugin component can render. Each is a fixed place in
 * the host's own layout, and a slot can hold components from several plugins.
 */
export enum PluginSlot {
  CONNECT_SCREEN = 'connect_screen',
  HOME_SCREEN = 'home_screen',
  CHAT_ACTIONS = 'chat_actions',
  MESSAGE_ACTIONS = 'message_actions',
  TOPBAR_RIGHT = 'topbar_right',
  FULL_SCREEN = 'full_screen',
  USER_SETTINGS = 'user_settings'
}

/**
 * What the host passes each slot's components. A slot that renders inside
 * something says what that something is, which is the only way a component can
 * know: the store's selected channel is a guess that is wrong in a thread, and
 * nothing in the store says which message a row belongs to.
 *
 * Ids only. Anything else about them is a lookup the plugin can do itself, on
 * the server where it has the whole row.
 */
export type TPluginSlotProps = {
  [PluginSlot.CONNECT_SCREEN]: EmptyProps;
  [PluginSlot.HOME_SCREEN]: EmptyProps;
  /** the composer the button sits in */
  [PluginSlot.CHAT_ACTIONS]: { channelId: number };
  /** the message the row belongs to */
  [PluginSlot.MESSAGE_ACTIONS]: { messageId: number; channelId: number };
  [PluginSlot.TOPBAR_RIGHT]: EmptyProps;
  [PluginSlot.FULL_SCREEN]: EmptyProps;
  [PluginSlot.USER_SETTINGS]: EmptyProps;
};

type EmptyProps = Record<string, never>;

/** A component the host renders, with whatever its slot passes. */
export type TPluginReactComponent<TProps = EmptyProps> =
  React.ComponentType<TProps>;

export type TPluginSlotRequirements = Partial<Record<PluginSlot, Permission>>;

/**
 * What a plugin's `client/index.js` exports as `components`.
 *
 * ```tsx
 * export const components: TPluginComponentsMapBySlotId = {
 *   [PluginSlot.CHAT_ACTIONS]: [({ channelId }) => <MyButton channelId={channelId} />],
 *   [PluginSlot.USER_SETTINGS]: [MyPreferences]
 * };
 * ```
 *
 * Each slot types its components from `TPluginSlotProps`, so a component that
 * takes no props still fits anywhere. Import React from the host through
 * `window.__SHARKORD_REACT__` rather than bundling your own, or hooks will
 * throw against a second copy.
 */
export type TPluginComponentsMapBySlotId = {
  [S in PluginSlot]?: TPluginReactComponent<TPluginSlotProps[S]>[];
};

export type TPluginComponentsMap = {
  [pluginId: string]: TPluginComponentsMapBySlotId;
};

/** One tab in the plugin's own view, beside Settings, Commands and Logs. */
export type TPluginTab = {
  /** unique within the plugin, and not one of the reserved built-in ids */
  id: string;
  /** shown on the tab itself, so write it in the language you ship */
  label: string;
  component: TPluginReactComponent;
};

/**
 * What a plugin annotates its `tabs` export with. Admin facing: these render in
 * server settings, where only someone who can manage plugins will see them.
 *
 * ```tsx
 * export const tabs: TPluginTabs = [
 *   { id: 'stats', label: 'Stats', component: Stats }
 * ];
 * ```
 */
export type TPluginTabs = TPluginTab[];

export type TPluginTabsMap = {
  [pluginId: string]: TPluginTab[];
};

/** built-in tab ids: a custom tab claiming one of these is dropped */
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
