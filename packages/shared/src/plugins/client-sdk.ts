import type {
  TCategory,
  TChannel,
  TJoinedEmoji,
  TJoinedPublicUser,
  TJoinedRole
} from '../tables';
import type { TPublicServerSettings } from '../types';
import type { TVoiceUserState } from '../voice';
import type { PluginCapabilityType } from './capabilities';
import type { TPluginMetadata } from './manifest';

/**
 * The slice of the client's state a plugin component can read, through
 * `store.getState()`. A snapshot, not live: subscribe to be told it changed.
 */
export type TPluginStoreState = {
  users: TJoinedPublicUser[];
  channels: TChannel[];
  categories: TCategory[];
  roles: TJoinedRole[];
  emojis: TJoinedEmoji[];
  plugins: TPluginMetadata[];
  ownUserId: number | undefined;
  selectedChannelId: number | undefined;
  currentVoiceChannelId: number | undefined;
  /**
   * the user's own mic and sound mute, camera and screen share. only
   * meaningful while `currentVoiceChannelId` is set. `soundMuted` is deafen:
   * audio a plugin plays for the call should stay silent while it is true
   */
  ownVoiceState: TVoiceUserState;
  /**
   * whether the user turned hotkeys on in their settings. hide controls for
   * binding keys while it is false: a bound key does nothing then
   */
  hotkeysEnabled: boolean;
  publicSettings: TPublicServerSettings | undefined;
};

/**
 * What a plugin's client code can ask the app to do, through
 * `window.__SHARKORD_STORE__.actions`.
 *
 * Every call takes the plugin id because a bundle has no identity of its own in
 * the page. Inside a rendered component prefer the hooks, which know which
 * plugin they belong to.
 */
export type TPluginActions = {
  /** sends as the signed-in user, not as the plugin */
  sendMessage: (channelId: number, content: string) => Promise<void>;
  selectChannel: (channelId: number) => void;
  /** calls one of the plugin's own `ctx.actions.register` functions */
  executePluginAction: <TResponse = unknown, TPayload = unknown>(
    pluginId: string,
    actionName: string,
    payload?: TPayload
  ) => Promise<TResponse>;
  /**
   * Calls one of the plugin's own `ctx.http` routes as the signed-in user: the
   * token is added for you, so a route registered with `auth: true` gets the
   * caller's `userId`. `init` is a normal `fetch` init, which makes this the
   * way to upload a file too: `{ method: 'POST', body: file }`.
   */
  fetchPluginRoute: (
    pluginId: string,
    path: string,
    init?: RequestInit
  ) => Promise<Response>;
  getUserData: (pluginId: string) => Promise<Record<string, unknown>>;
  setUserData: (
    pluginId: string,
    data: Record<string, unknown>
  ) => Promise<void>;
  onPush: (pluginId: string, handler: (data: unknown) => void) => () => void;
};

export type TPluginUserData<
  T extends Record<string, unknown> = Record<string, unknown>
> = {
  data: T;
  loading: boolean;
  save: (data: T) => Promise<void>;
};

/**
 * `down` when the key goes down and `up` when it is released. A `press` action
 * only ever receives `down`.
 */
export type TPluginHotkeyPhase = 'down' | 'up';

export type TPluginHotkeyMode = 'press' | 'hold';

/**
 * The text a key picker shows, already translated.
 */
export type THotkeyInputLabels = {
  unbound: string;
  recording: string;
  clear: string;
  hint: string;
};

/**
 * An action the user can bind a key to. `id` is unique inside your plugin and
 * the host namespaces it for you. `label` is what the user reads in the Hotkeys
 * settings. `mode` is `press` (default) to fire once per key press, or `hold` to
 * also report the release.
 */
export type TPluginHotkeyAction = {
  id: string;
  label: string;
  mode?: TPluginHotkeyMode;
};

/**
 * Everything one bindable key needs. Spread it into the `HotkeyInput` from
 * `@sharkord/ui` to get a control that records the key. `value` is the stored
 * combo, `display` is the same key as the user should read it, both
 * `undefined` while unbound. `labels` are already translated, `onChange` returns
 * a message when the key is refused and nothing when it is taken, `onClear`
 * removes the bind, and `error` is a problem Sharkord found with the bind.
 */
export type TPluginHotkeyBinding = {
  value: string | undefined;
  display: string | undefined;
  labels: THotkeyInputLabels;
  error: string | undefined;
  onChange: (combo: string) => string | undefined;
  onClear: () => void;
};

export type TPluginHooks = {
  usePush: (handler: (data: unknown) => void) => void;
  useUserData: () => TPluginUserData;
  useCanUse: (type: PluginCapabilityType, name: string) => boolean;
  usePlaybackDeviceId: () => string | undefined;
  useHotkey: (
    action: TPluginHotkeyAction,
    handler: (phase: TPluginHotkeyPhase) => void
  ) => void;
  useHotkeyBinding: (id: string) => TPluginHotkeyBinding;
};

/**
 * The bridge between a plugin's client code and the app, on
 * `window.__SHARKORD_STORE__`.
 */
export type TPluginStore = {
  getState: () => TPluginStoreState;
  /**
   * Fires on **every** state change in the app, not only the parts you read, so
   * compare what you care about before doing work. Returns an unsubscribe.
   */
  subscribe: (listener: () => void) => () => void;
  actions: TPluginActions;
  /**
   * React hooks created by the host, so they share its React and know which
   * plugin is rendering. Only valid inside a component the host renders.
   */
  hooks: TPluginHooks;
};

export const getPluginIdFromBundleUrl = (url: string): string | undefined => {
  const match = url.match(/\/plugin-bundle\/([^/?#]+)\//);

  if (!match?.[1]) return undefined;

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return undefined;
  }
};
