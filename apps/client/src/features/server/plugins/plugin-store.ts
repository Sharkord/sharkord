import { store } from '@/features/store';
import { getPluginRouteUrl } from '@/helpers/get-plugin-route-url';
import { getSessionStorageItem, SessionStorageKey } from '@/helpers/storage';
import { getTRPCClient } from '@/lib/trpc';
import type { TPluginActions, TPluginStore } from '@sharkord/shared';
import { prepareMessageHtml, UploadHeaders } from '@sharkord/shared';
import { setSelectedChannelId } from '../channels/actions';
import { mapStateToPluginState } from '../selectors';
import { usePluginUserData } from './use-plugin-user-data';

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
    }),
  getUserData: async (pluginId: string) => {
    const trpc = getTRPCClient();

    return trpc.plugins.getUserData.query({ pluginId });
  },
  setUserData: async (pluginId: string, data: Record<string, unknown>) => {
    const trpc = getTRPCClient();

    await trpc.plugins.setUserData.mutate({ pluginId, data });
  }
};

const pluginStore: TPluginStore = {
  getState: () => mapStateToPluginState(store.getState()),
  subscribe: (listener: () => void) => store.subscribe(listener),
  actions: pluginActions,
  hooks: { useUserData: usePluginUserData }
};

const exposePluginStore = () => {
  window.__SHARKORD_STORE__ = pluginStore;
};

export { exposePluginStore, pluginActions, pluginStore };
