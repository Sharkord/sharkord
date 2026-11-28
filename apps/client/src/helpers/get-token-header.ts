import { UploadHeaders } from '@sharkord/shared';
import { getSessionStorageItem, SessionStorageKey } from './storage';

export const getTokenHeader = () => ({
  [UploadHeaders.TOKEN]: getSessionStorageItem(SessionStorageKey.TOKEN) ?? ''
});
