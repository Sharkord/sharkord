import type { TFile } from '@sharkord/shared';
import { getSessionStorageItem, SessionStorageKey } from './storage';

const getHostFromServer = () => {
  if (import.meta.env.MODE === 'development') {
    return 'localhost:4991';
  }

  return window.location.host;
};

const getUrlFromServer = () => {
  if (import.meta.env.MODE === 'development') {
    return 'http://localhost:4991';
  }

  const host = window.location.host;
  const currentProtocol = window.location.protocol;

  const finalUrl = `${currentProtocol}//${host}`;

  return finalUrl;
};

const getFileUrl = (file: TFile | undefined | null) => {
  if (!file) return '';

  const url = getUrlFromServer();
  const params = new URLSearchParams();

  const token = getSessionStorageItem(SessionStorageKey.TOKEN);
  if (token) {
    params.set('token', token);
  }

  if (file._accessToken) {
    params.set('accessToken', file._accessToken);
  }

  const query = params.toString();

  return encodeURI(`${url}/public/${file.name}${query ? `?${query}` : ''}`);
};

export { getFileUrl, getHostFromServer, getUrlFromServer };
