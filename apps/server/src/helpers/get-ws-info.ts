import type http from 'http';
import { UAParser } from 'ua-parser-js';
import type { TConnectionInfo } from '../types';

const getWsIp = (
  ws: any | undefined,
  req: http.IncomingMessage
): string | undefined => {
  const headers = req?.headers || {};

  let ip =
    headers['cf-connecting-ip'] ||
    headers['cf-real-ip'] ||
    headers['x-real-ip'] ||
    headers['x-forwarded-for'] ||
    headers['x-client-ip'] ||
    headers['x-cluster-client-ip'] ||
    headers['forwarded-for'] ||
    headers['forwarded'] ||
    ws?._socket?.remoteAddress ||
    ws?.socket?.remoteAddress ||
    req?.socket?.remoteAddress ||
    req?.connection?.remoteAddress;

  if (!ip) return undefined;

  if (typeof ip !== 'string') {
    ip = String(ip);
  }

  if (ip.includes(',')) {
    ip = ip.split(',')[0].trim();
  }

  if (ip.startsWith('::ffff:')) {
    ip = ip.slice(7);
  }

  if (ip === '::1') {
    ip = '127.0.0.1';
  }

  if (ip.startsWith('[') && ip.endsWith(']')) {
    ip = ip.slice(1, -1);
  }

  return ip || undefined;
};

const getWsInfo = (
  ws: any | undefined,
  req: http.IncomingMessage
): TConnectionInfo | undefined => {
  const ip = getWsIp(ws, req);
  const userAgent = req?.headers?.['user-agent'];

  if (!ip && !userAgent) return undefined;

  const parser = new UAParser(userAgent || '');
  const result = parser.getResult();

  return {
    ip,
    os: result.os.name
      ? [result.os.name, result.os.version].filter(Boolean).join(' ')
      : undefined,
    device: result.device.type
      ? [result.device.vendor, result.device.model]
          .filter(Boolean)
          .join(' ')
          .trim()
      : 'Desktop',
    userAgent: userAgent || undefined
  };
};

export { getWsInfo };
