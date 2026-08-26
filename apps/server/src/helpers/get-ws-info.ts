import type http from 'http';
import ipaddr from 'ipaddr.js';
import { UAParser } from 'ua-parser-js';
import { config } from '../config';
import { logger } from '../logger';
import type { TConnectionInfo } from '../types';
import { isPublicIp } from './network';

const MAX_IP_CANDIDATES = 20;
const MAX_HEADER_LENGTH = 2048;

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

// the client is the right-most entry that is not one of our own proxies. everything to its
// left was written by whoever connected to that proxy and can say anything: nginx's standard
// `$proxy_add_x_forwarded_for` keeps the client's header and appends the peer, so a client
// sending `X-Forwarded-For: 1.2.3.4` arrives as `1.2.3.4, <real client>`. picking the
// left-most public looking entry there hands every rate limit bucket to the caller
const pickClientIpFromChain = (
  candidates: string[],
  trustedProxies: string[]
): string | undefined => {
  const normalized = candidates
    .slice(0, MAX_IP_CANDIDATES)
    .map(normalizeIp)
    .filter((ip): ip is string => Boolean(ip));

  if (!normalized.length) return undefined;

  for (let index = normalized.length - 1; index >= 0; index--) {
    const candidate = normalized[index]!;

    if (!isTrustedProxyAddress(candidate, trustedProxies)) return candidate;
  }

  // the whole chain is our own infrastructure, so the left-most is as far back as it goes
  return normalized[0];
};

// resolves the client ip a proxy claims to be forwarding. never call this without first
// proving the connection came from a trusted proxy: every header read here is attacker
// controlled on a direct connection.
//
// only the two chain headers are read. single-value vendor headers (`cf-connecting-ip`,
// `x-real-ip` and friends) carry no hop information, so a value the proxy set and one the
// client sent are indistinguishable, and any proxy that does not overwrite them is a
// spoofing hole. a deployment that sets none of these falls back to the socket address,
// which over-limits rather than under-limits
const getForwardedIp = (
  headers: http.IncomingHttpHeaders,
  trustedProxies: string[]
): string | undefined => {
  const xForwardedFor = getHeaderValue(headers, 'x-forwarded-for');

  if (xForwardedFor) {
    const ip = pickClientIpFromChain(
      splitCommaSeparated(xForwardedFor),
      trustedProxies
    );

    if (ip) return ip;
  }

  const forwarded = getHeaderValue(headers, 'forwarded');

  if (forwarded) {
    const ip = pickClientIpFromChain(
      extractForwardedCandidates(forwarded),
      trustedProxies
    );

    if (ip) return ip;
  }

  return undefined;
};

const matchesProxyEntry = (address: string, entry: string): boolean => {
  try {
    const parsed = ipaddr.parse(address);

    if (entry.includes('/')) {
      const cidr = ipaddr.parseCIDR(entry);

      // ipaddr throws when the kinds differ, so check before matching
      if (parsed.kind() !== cidr[0].kind()) return false;

      return parsed.match(cidr);
    }

    const normalizedEntry = normalizeIp(entry);

    return !!normalizedEntry && normalizedEntry === address;
  } catch {
    return false;
  }
};

const isTrustedProxyAddress = (
  address: string | undefined,
  trustedProxies: string[]
): boolean => {
  if (!address) return false;

  return trustedProxies.some((entry) => matchesProxyEntry(address, entry));
};

const getSocketIp = (
  ws: any | undefined,
  req: http.IncomingMessage | undefined
): string | undefined => {
  const socketCandidates = [
    ws?._socket?.remoteAddress,
    ws?.socket?.remoteAddress,
    req?.socket?.remoteAddress
  ].filter((v): v is string => typeof v === 'string' && v.length > 0);

  return pickBestIp(socketCandidates);
};

let hasWarnedAboutUntrustedProxy = false;

const warnAboutUntrustedProxy = (
  socketIp: string | undefined,
  headers: http.IncomingHttpHeaders
) => {
  if (hasWarnedAboutUntrustedProxy) return;
  if (!headers['x-forwarded-for'] && !headers['forwarded']) return;

  hasWarnedAboutUntrustedProxy = true;

  logger.warn(
    'Requests are arriving from %s with forwarded headers, but that address is not in server.trustedProxies, so the headers are ignored and every client is rate limited as one. Add it to server.trustedProxies (or SHARKORD_TRUSTED_PROXIES) if it is your proxy.',
    socketIp ?? 'an unknown address'
  );
};

const getWsIp = (
  ws: any | undefined,
  req: http.IncomingMessage | undefined
): string | undefined => {
  const socketIp = getSocketIp(ws, req);
  const { trustedProxies } = config.server;

  if (!isTrustedProxyAddress(socketIp, trustedProxies)) {
    warnAboutUntrustedProxy(socketIp, req?.headers ?? {});

    return socketIp;
  }

  return getForwardedIp(req?.headers ?? {}, trustedProxies) ?? socketIp;
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

export { getForwardedIp, getWsInfo, isTrustedProxyAddress };
