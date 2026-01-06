import type { TIpInfo } from '@sharkord/shared';
import { ipCache } from './ip-cache';

const getIpInfo = async (ip: string) => {
  const isLocalIp =
    ip.startsWith('192.168.') || ip.startsWith('::1') || ip === '127.0.0.1';

  const cachedData = ipCache.get(ip);

  if (cachedData) {
    return cachedData;
  }

  const url = isLocalIp
    ? 'https://ipinfo.io/json'
    : `https://ipinfo.io/${ip}/json`;

  const response = await fetch(url);
  const data = (await response.json()) as TIpInfo;

  ipCache.set(ip, data);

  return data;
};

export { getIpInfo };
