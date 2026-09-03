import type {
  TCategory,
  TChannel,
  TJoinedEmoji,
  TJoinedPublicUser,
  TJoinedRole
} from '../tables';
import type { TPublicServerSettings } from '../types';
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

export type TPluginHooks = {
  usePush: (handler: (data: unknown) => void) => void;
  useUserData: () => TPluginUserData;
  useCanUse: (type: PluginCapabilityType, name: string) => boolean;
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
