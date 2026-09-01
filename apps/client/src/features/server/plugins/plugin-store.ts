import { store } from '@/features/store';
import { getPluginRouteUrl } from '@/helpers/get-plugin-route-url';
import { getSessionStorageItem, SessionStorageKey } from '@/helpers/storage';
import { getTRPCClient } from '@/lib/trpc';
import type { TPluginActions, TPluginStore } from '@sharkord/shared';
import { prepareMessageHtml, UploadHeaders } from '@sharkord/shared';
import { setSelectedChannelId } from '../channels/actions';
import { mapStateToPluginState } from '../selectors';

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
    pluginId: string,
    actionName: string,
    payload?: TPayload
  ) => {
    const trpc = getTRPCClient();

    return trpc.plugins.executeAction.mutate({
      pluginId,
      actionName,
      payload
    }) as Promise<TResponse>;
  },
  fetchPluginRoute: (pluginId: string, path: string, init?: RequestInit) =>
    fetch(getPluginRouteUrl(pluginId, path), {
      ...init,
      headers: {
        ...init?.headers,
        [UploadHeaders.TOKEN]:
          getSessionStorageItem(SessionStorageKey.TOKEN) ?? ''
      }
    })
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
