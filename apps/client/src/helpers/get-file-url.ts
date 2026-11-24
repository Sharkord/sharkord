import type { TFile } from '@sharkord/shared';

const getServerHost = () => {
  if (import.meta.env.MODE === 'development') {
    return `${window.location.hostname}:4991`;
  }

  return window.location.host;
};

const getServerUrl = () => {
  if (import.meta.env.MODE === 'development') {
    return `http://${getServerHost()}`;
  }

  const host = window.location.host;
  const currentProtocol = window.location.protocol;

  const finalUrl = `${currentProtocol}//${host}`;

  return finalUrl;
};

const getFileUrl = (file: TFile | undefined | null) => {
  if (!file) return '';

  const url = getServerUrl();

  let baseUrl = `${url}/public/${encodeURIComponent(file.name)}`;

  if (file._accessToken) {
    baseUrl += `?accessToken=${file._accessToken}`;

    if (file._accessTokenExpiresAt) {
      baseUrl += `&expires=${file._accessTokenExpiresAt}`;
    }
  }

  return baseUrl;
};

const resolveServerUrl = (url: string) => {
  if (!url.startsWith('/')) return url;

  return `${getServerUrl()}${url}`;
};

export { getFileUrl, getServerHost, getServerUrl, resolveServerUrl };
