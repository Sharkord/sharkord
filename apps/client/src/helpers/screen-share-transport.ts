import type { TScreenShareTransport } from '@/types';
import {
  getLocalStorageItem,
  LocalStorageKey,
  setLocalStorageItem
} from './storage';

const getScreenShareTransport = (): TScreenShareTransport => {
  return getLocalStorageItem(LocalStorageKey.SCREEN_SHARE_TRANSPORT) ===
    'server'
    ? 'server'
    : 'direct';
};

const setScreenShareTransport = (transport: TScreenShareTransport): void => {
  setLocalStorageItem(LocalStorageKey.SCREEN_SHARE_TRANSPORT, transport);
};

export { getScreenShareTransport, setScreenShareTransport };
