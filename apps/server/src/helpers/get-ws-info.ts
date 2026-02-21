import type http from 'http';
import ipaddr from 'ipaddr.js';
import { UAParser } from 'ua-parser-js';
import type { TConnectionInfo } from '../types';

// have no fucking idea what's going on in this file
// 100% trusting AI on this one

const MAX_IP_CANDIDATES = 20;
const MAX_HEADER_LENGTH = 2048;
const DIRECT_HEADERS = [
  'cf-connecting-ip',
  'true-client-ip',
  'cf-real-ip',
  'x-real-ip',
  'x-client-ip',
  'x-cluster-client-ip',
  'fly-client-ip',
  'fastly-client-ip'
];

const getHeaderValue = (
  headers: http.IncomingHttpHeaders,
  name: string
): string | undefined => {
  const value = headers[name];

  if (!value) return undefined;

  let result: string;

  if (Array.isArray(value)) {
    result = value
      .map((v) => v.trim())
      .filter(Boolean)
      .join(',');
  } else {
    result = value.trim();
  }

  if (!result || result.length > MAX_HEADER_LENGTH) return undefined;

  return result;
};

const splitCommaSeparated = (value: string): string[] =>
  value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, MAX_IP_CANDIDATES);

const toCanonical = (
  parsed: ipaddr.IPv4 | ipaddr.IPv6
): ipaddr.IPv4 | ipaddr.IPv6 => {
  if (parsed.kind() === 'ipv6') {
    const v6 = parsed as ipaddr.IPv6;
    if (v6.isIPv4MappedAddress()) return v6.toIPv4Address();
  }
  return parsed;
};

const normalizeIp = (value: string): string | undefined => {
  try {
    let candidate = value.trim();

    if (!candidate) return undefined;

    if (candidate.toLowerCase().startsWith('for=')) {
      candidate = candidate.slice(4).trim();
    }

    candidate = candidate.replace(/^["']|["']$/g, '');

    if (candidate.startsWith('[') && candidate.includes(']')) {
      candidate = candidate.slice(1, candidate.indexOf(']'));
    }

    const colonCount = candidate.split(':').length - 1;

    if (colonCount === 1 && candidate.includes('.')) {
      const host = candidate.slice(0, candidate.indexOf(':'));
      if (ipaddr.isValid(host)) {
        candidate = host;
      }
    }

    if (!ipaddr.isValid(candidate)) return undefined;

    return toCanonical(ipaddr.parse(candidate)).toString();
  } catch {
    return undefined;
  }
};

const isPublicIp = (ip: string): boolean => {
  try {
    return toCanonical(ipaddr.parse(ip)).range() === 'unicast';
  } catch {
    return false;
  }
};

const pickBestIp = (candidates: string[]): string | undefined => {
  const normalized = candidates
    .slice(0, MAX_IP_CANDIDATES)
    .map(normalizeIp)
    .filter((ip): ip is string => Boolean(ip));

  if (!normalized.length) return undefined;

  return normalized.find(isPublicIp) ?? normalized[0];
};

const extractForwardedCandidates = (value: string): string[] =>
  value
    .split(',')
    .flatMap((entry) =>
      entry
        .split(';')
        .map((p) => p.trim())
        .filter((p) => p.toLowerCase().startsWith('for='))
        .map((p) => p.slice(4))
    )
    .slice(0, MAX_IP_CANDIDATES);

const getWsIp = (
  ws: any | undefined,
  req: http.IncomingMessage | undefined
): string | undefined => {
  const headers = req?.headers ?? {};

  // 1. high-trust CDN / proxy headers (single-value, most trustworthy)
  for (const header of DIRECT_HEADERS) {
    const value = getHeaderValue(headers, header);
    if (!value) continue;

    const ip = pickBestIp(splitCommaSeparated(value));
    if (ip) return ip;
  }

  // 2. standard multi-hop proxy header
  const xForwardedFor = getHeaderValue(headers, 'x-forwarded-for');
  if (xForwardedFor) {
    const ip = pickBestIp(splitCommaSeparated(xForwardedFor));
    if (ip) return ip;
  }

  // 3. RFC 7239 Forwarded header
  const forwarded = getHeaderValue(headers, 'forwarded');
  if (forwarded) {
    const ip = pickBestIp(extractForwardedCandidates(forwarded));
    if (ip) return ip;
  }

  // 4. fallback to raw socket remote address
  const socketCandidates = [
    ws?._socket?.remoteAddress,
    ws?.socket?.remoteAddress,
    req?.socket?.remoteAddress
  ].filter((v): v is string => typeof v === 'string' && v.length > 0);

  return pickBestIp(socketCandidates);
};

const getWsInfo = (
  ws: any | undefined,
  req: http.IncomingMessage | undefined
): TConnectionInfo | undefined => {
  if (!ws && !req) return undefined;

  const ip = getWsIp(ws, req);
  const userAgent = req?.headers?.['user-agent'] || undefined;

  if (!ip && !userAgent) return undefined;

  let os: string | undefined;
  let device: string | undefined;

  if (userAgent) {
    try {
      const result = new UAParser(userAgent).getResult();

      os = result.os.name
        ? [result.os.name, result.os.version].filter(Boolean).join(' ')
        : undefined;

      device = result.device.type
        ? [result.device.vendor, result.device.model]
            .filter(Boolean)
            .join(' ')
            .trim() || undefined
        : 'Desktop';
    } catch {
      // agent parsing failed, ignore and proceed with undefined values
    }
  }

  return { ip, os, device, userAgent };
};

export { getWsInfo };
