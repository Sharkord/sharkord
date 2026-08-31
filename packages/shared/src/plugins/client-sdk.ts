import type {
  TCategory,
  TChannel,
  TJoinedEmoji,
  TJoinedPublicUser,
  TJoinedRole
} from '../tables';
import type { TPublicServerSettings } from '../types';
import type { TPluginMetadata } from './manifest';

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

export type TActionContract = Record<
  string,
  { payload: unknown; response: unknown }
>;

export type TPluginActions = {
  sendMessage: (channelId: number, content: string) => Promise<void>;
  selectChannel: (channelId: number) => void;
  executePluginAction: <TResponse = unknown, TPayload = unknown>(
    pluginId: string,
    actionName: string,
    payload?: TPayload
  ) => Promise<TResponse>;
};

export type TPluginStore = {
  getState: () => TPluginStoreState;
  subscribe: (listener: () => void) => () => void;
  actions: TPluginActions;
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
