import { store, type IRootState } from '@/features/store';
import { getTRPCClient } from '@/lib/trpc';
import type {
  TPluginActions,
  TPluginStore,
  TPluginStoreState
} from '@sharkord/shared';
import { prepareMessageHtml } from '@sharkord/shared';
import { setSelectedChannelId } from '../channels/actions';

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
