import { store, type IRootState } from '@/features/store';
import { getTRPCClient } from '@/lib/trpc';
import type {
  TPluginActions,
  TPluginStore,
  TPluginStoreState
} from '@sharkord/shared';
import { prepareMessageHtml } from '@sharkord/shared';
import { setSelectedChannelId } from '../channels/actions';

// I honestly can't tell if this is a genius or disgusting, I'm in shock
const getPluginIdFromCallerStack = (): string => {
  const stack = new Error().stack ?? '';
  const match = stack.match(/\/plugin-bundle\/([^/]+)\//);

  if (!match?.[1]) {
    throw new Error(
      'executePluginAction can only be called from plugin client code.'
    );
  }

  return decodeURIComponent(match[1]);
};

const mapStateToPluginState = (state: IRootState): TPluginStoreState => ({
  users: state.server.users,
  channels: state.server.channels,
  categories: state.server.categories,
  roles: state.server.roles,
  emojis: state.server.emojis,
  plugins: state.server.pluginsMetadata,
  ownUserId: state.server.ownUserId,
  selectedChannelId: state.server.selectedChannelId,
  currentVoiceChannelId: state.server.currentVoiceChannelId,
  publicSettings: state.server.publicSettings
});

const pluginActions: TPluginActions = {
  sendMessage: async (channelId: number, content: string) => {
    const trpc = getTRPCClient();

    await trpc.messages.send.mutate({
      channelId,
      content: prepareMessageHtml(`<p>${content}</p>`),
      files: []
    });
  },
  selectChannel: (channelId: number) => {
    setSelectedChannelId(channelId);
  },
  executePluginAction: async <TResponse = unknown, TPayload = unknown>(
    actionName: string,
    payload?: TPayload
  ) => {
    const trpc = getTRPCClient();
    const pluginId = getPluginIdFromCallerStack();

    return trpc.plugins.executeAction.mutate({
      pluginId,
      actionName,
      payload
    }) as Promise<TResponse>;
  }
};

const pluginStore: TPluginStore = {
  getState: () => mapStateToPluginState(store.getState()),
  subscribe: (listener: () => void) => store.subscribe(listener),
  actions: pluginActions
};

const exposePluginStore = () => {
  window.__SHARKORD_STORE__ = pluginStore;
};

export { exposePluginStore, pluginActions, pluginStore };
