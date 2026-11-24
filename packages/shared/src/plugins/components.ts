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
  MESSAGE_FOOTER = 'message_footer',
  MEMBER_LIST_ITEM = 'member_list_item',
  USER_POPOVER = 'user_popover',
  CHANNEL_HEADER = 'channel_header',
  TOPBAR_RIGHT = 'topbar_right',
  FULL_SCREEN = 'full_screen',
  USER_SETTINGS = 'user_settings',
  VOICE_CONTROLS = 'voice_controls',
  VOICE_USER_CARD = 'voice_user_card',
  VOICE_USER_ROW = 'voice_user_row'
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
  /** the message rendered above it */
  [PluginSlot.MESSAGE_FOOTER]: { messageId: number; channelId: number };
  /** the member of the row. renders once per member, so keep it cheap */
  [PluginSlot.MEMBER_LIST_ITEM]: { userId: number };
  /** the user whose card is open */
  [PluginSlot.USER_POPOVER]: { userId: number };
  /** the channel being read */
  [PluginSlot.CHANNEL_HEADER]: { channelId: number };
  [PluginSlot.TOPBAR_RIGHT]: EmptyProps;
  [PluginSlot.FULL_SCREEN]: EmptyProps;
  [PluginSlot.USER_SETTINGS]: EmptyProps;
  /**
   * the voice channel the user is connected to. beside the camera and screen
   * buttons, and only rendered while connected
   */
  [PluginSlot.VOICE_CONTROLS]: { channelId: number };
  /**
   * the user whose card it is, in the voice channel being viewed. renders in
   * the top left corner of every card, so keep it small
   */
  [PluginSlot.VOICE_USER_CARD]: { channelId: number; userId: number };
  /**
   * the user of the row under a voice channel in the sidebar. renders once per
   * user in every voice channel, so keep it cheap
   */
  [PluginSlot.VOICE_USER_ROW]: { channelId: number; userId: number };
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
 *
 * Whatever else the component imports is downloaded by everyone who opens the
 * server. `@sharkord/ui` is a normal dependency and copies what you use into
 * your bundle; the sdk's own enums and types cost only what you use.
 */
export type TPluginComponentsMapBySlotId = {
  [S in PluginSlot]?: TPluginReactComponent<TPluginSlotProps[S]>[];
};

export type TPluginComponentsMap = {
  [pluginId: string]: TPluginComponentsMapBySlotId;
};

/**
 * One component a plugin attaches to its own message with `messages.send`.
 * `name` is a key of the plugin's `messageComponents` export.
 */
export type TPluginMessageComponent = {
  name: string;
  props?: Record<string, unknown>;
};

/** What a message component receives: its message, and the props it was sent with. */
export type TPluginMessageComponentProps = {
  messageId: number;
  channelId: number;
  props: Record<string, unknown>;
};

/**
 * What a plugin's `client/index.js` exports as `messageComponents`, keyed by
 * the `name` its messages use. Only messages the plugin sent itself render
 * them, so no other plugin's message ever reaches these.
 *
 * ```tsx
 * export const messageComponents: TPluginMessageComponentsMap = {
 *   poll: ({ messageId, props }) => <Poll messageId={messageId} {...props} />
 * };
 * ```
 */
export type TPluginMessageComponentsMap = {
  [name: string]: TPluginReactComponent<TPluginMessageComponentProps>;
};

export type TPluginMessageComponentsByPlugin = {
  [pluginId: string]: TPluginMessageComponentsMap;
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

/**
 * One full screen page, opened from its own button in the left sidebar. A
 * plugin can have several, each with its own label.
 */
export type TPluginPage = {
  /** unique within the plugin */
  id: string;
  /** shown on the sidebar button, so write it in the language you ship */
  label: string;
  component: TPluginReactComponent;
  /**
   * The sidebar button's icon, the plugin logo without one. An http(s) or
   * `data:image/...` url, or a component drawing an svg, which can follow the
   * theme with `currentColor`. It renders at 16 by 16.
   */
  icon?: string | TPluginReactComponent;
};

/**
 * What a plugin annotates its `pages` export with. Pages render for users
 * holding `USE_PLUGINS`, and all of a plugin's pages share the requirement of
 * its `FULL_SCREEN` slot from `ctx.ui.enable()`.
 *
 * ```tsx
 * export const pages: TPluginPages = [
 *   { id: 'supporters', label: 'Supporters', component: Supporters }
 * ];
 * ```
 */
export type TPluginPages = TPluginPage[];

export type TPluginPagesMap = {
  [pluginId: string]: TPluginPage[];
};

/** built-in tab ids: a custom tab claiming one of these is dropped */
export const RESERVED_PLUGIN_TAB_IDS = ['settings', 'commands', 'logs'];

const isRenderableComponent = (value: unknown) =>
  typeof value === 'function' ||
  (typeof value === 'object' && value !== null && '$$typeof' in value);

const isValidLabeledComponent = (entry: unknown): entry is TPluginTab => {
  if (!entry || typeof entry !== 'object') return false;

  const { id, label, component } = entry as Partial<TPluginTab>;

  return (
    typeof id === 'string' &&
    id.length > 0 &&
    typeof label === 'string' &&
    label.length > 0 &&
    isRenderableComponent(component)
  );
};

const parseLabeledComponents = (
  value: unknown,
  reservedIds: string[]
): TPluginTab[] => {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>(reservedIds);

  return value.filter((entry): entry is TPluginTab => {
    if (!isValidLabeledComponent(entry) || seen.has(entry.id)) return false;

    seen.add(entry.id);

    return true;
  });
};

export const parsePluginTabs = (value: unknown): TPluginTab[] =>
  parseLabeledComponents(value, RESERVED_PLUGIN_TAB_IDS);

const parsePageIcon = (icon: unknown): TPluginPage['icon'] => {
  if (typeof icon === 'string' && icon.length > 0) return icon;
  if (isRenderableComponent(icon)) return icon as TPluginReactComponent;

  return undefined;
};

export const parsePluginPages = (value: unknown): TPluginPage[] =>
  parseLabeledComponents(value, []).map((page) => ({
    ...page,
    icon: parsePageIcon((page as TPluginPage).icon)
  }));

export const parseMessageComponentsExport = (
  value: unknown
): TPluginMessageComponentsMap => {
  if (!value || typeof value !== 'object') return {};

  return Object.fromEntries(
    Object.entries(value).filter(([, component]) =>
      isRenderableComponent(component)
    )
  );
};
