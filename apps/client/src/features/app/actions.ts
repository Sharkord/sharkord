import { getFileUrl, getUrlFromServer } from '@/helpers/get-file-url';
import { LocalStorageKey, setLocalStorageItemBool } from '@/helpers/storage';
import type { TMessageJumpToTarget } from '@/types';
import type { TServerInfo } from '@sharkord/shared';
import { toast } from 'sonner';
import { setInfo } from '../server/actions';
import { store } from '../store';
import { appSliceActions } from './slice';

export const setAppLoading = (loading: boolean) =>
  store.dispatch(appSliceActions.setAppLoading(loading));

export const setIsAutoConnecting = (isAutoConnecting: boolean) =>
  store.dispatch(appSliceActions.setIsAutoConnecting(isAutoConnecting));

export const setPluginsLoading = (loading: boolean) =>
  store.dispatch(appSliceActions.setLoadingPlugins(loading));

const setOrCreateMeta = (name: string, content: string) => {
  let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);

  if (!el) {
    el = document.createElement('meta');
    el.name = name;
    document.head.appendChild(el);
  }

  el.content = content;
};

const setOrCreateLink = (rel: string, href: string) => {
  let el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);

  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    document.head.appendChild(el);
  }

  el.href = href;
};

const applyServerBranding = (info: TServerInfo) => {
  document.title = info.name;

  const logoUrl = info.logo
    ? getFileUrl(info.logo)
    : `${getUrlFromServer()}/favicon.ico`;

  setOrCreateLink('icon', logoUrl);
  setOrCreateLink('apple-touch-icon', logoUrl);
  setOrCreateMeta('apple-mobile-web-app-title', info.name);
};

export const fetchServerInfo = async (): Promise<TServerInfo | undefined> => {
  try {
    const url = getUrlFromServer();
    const response = await fetch(`${url}/info`);

    if (!response.ok) {
      throw new Error('Failed to fetch server info');
    }

    const data = await response.json();

    return data;
  } catch (error) {
    console.error('Error fetching server info:', error);
  }
};

export const loadApp = async () => {
  const info = await fetchServerInfo();

  if (!info) {
    console.error('Failed to load server info during app load');
    toast.error('Failed to load server info');
    return;
  }

  setInfo(info);
  applyServerBranding(info);
  setAppLoading(false);
};

export const setModViewOpen = (isOpen: boolean, userId?: number) =>
  store.dispatch(
    appSliceActions.setModViewOpen({
      modViewOpen: isOpen,
      userId
    })
  );

export const openThreadSidebar = (parentMessageId: number, channelId: number) =>
  store.dispatch(
    appSliceActions.setThreadSidebarOpen({
      open: true,
      parentMessageId,
      channelId
    })
  );

export const closeThreadSidebar = () =>
  store.dispatch(
    appSliceActions.setThreadSidebarOpen({
      open: false,
      parentMessageId: undefined,
      channelId: undefined
    })
  );

export const resetApp = () => {
  store.dispatch(
    appSliceActions.setModViewOpen({
      modViewOpen: false,
      userId: undefined
    })
  );
  store.dispatch(
    appSliceActions.setThreadSidebarOpen({
      open: false,
      parentMessageId: undefined,
      channelId: undefined
    })
  );
};

export const setAutoJoinLastChannel = (autoJoin: boolean) => {
  store.dispatch(appSliceActions.setAutoJoinLastChannel(autoJoin));

  setLocalStorageItemBool(LocalStorageKey.AUTO_JOIN_LAST_CHANNEL, autoJoin);
};

export const setDmsOpen = (open: boolean) =>
  store.dispatch(appSliceActions.setDmsOpen(open));

export const setSelectedDmChannelId = (channelId: number | undefined) =>
  store.dispatch(appSliceActions.setSelectedDmChannelId(channelId));

export const setBrowserNotifications = async (enabled: boolean) => {
  if (enabled && 'Notification' in window) {
    const permission = await Notification.requestPermission();

    if (permission !== 'granted') {
      toast.error('Notification permission was denied.');

      return;
    }
  }

  store.dispatch(appSliceActions.setBrowserNotifications(enabled));
  setLocalStorageItemBool(LocalStorageKey.BROWSER_NOTIFICATIONS, enabled);
};

export const setBrowserNotificationsForMentions = (enabled: boolean) => {
  store.dispatch(appSliceActions.setBrowserNotificationsForMentions(enabled));
  setLocalStorageItemBool(
    LocalStorageKey.BROWSER_NOTIFICATIONS_FOR_MENTIONS,
    enabled
  );
};

export const setBrowserNotificationsForDms = async (enabled: boolean) => {
  if (enabled && 'Notification' in window) {
    const permission = await Notification.requestPermission();

    if (permission !== 'granted') {
      return;
    }
  }

  store.dispatch(appSliceActions.setBrowserNotificationsForDms(enabled));
  setLocalStorageItemBool(
    LocalStorageKey.BROWSER_NOTIFICATIONS_FOR_DMS,
    enabled
  );
};

export const setMessageJumpTarget = (
  payload: TMessageJumpToTarget | undefined
) => store.dispatch(appSliceActions.setMessageJumpTarget(payload));
