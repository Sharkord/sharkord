import type http from 'http';
import ipaddr from 'ipaddr.js';
import { UAParser } from 'ua-parser-js';
import type { TConnectionInfo } from '../types';

const PRIVATE_IP_RANGES = new Set([
  'unspecified',
  'broadcast',
  'multicast',
  'linkLocal',
  'loopback',
  'private',
  'uniqueLocal',
  'carrierGradeNat',
  'reserved',
  'ipv4Mapped',
  'rfc6145',
  'rfc6052',
  '6to4',
  'teredo'
]);

const getHeaderValue = (
  headers: http.IncomingHttpHeaders,
  name: string
): string | undefined => {
  const value = headers[name];

  if (!value) return undefined;

  if (Array.isArray(value)) {
    return value
      .map((entry) => entry.trim())
      .filter(Boolean)
      .join(',');
  }

  return value.trim();
};

const splitCommaSeparated = (value: string): string[] => {
  const result: string[] = [];

  let current = '';
  let inQuotes = false;

  for (const char of value) {
    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;

      continue;
    }

    if (char === ',' && !inQuotes) {
      const token = current.trim();

      if (token) result.push(token);

      current = '';

      continue;
    }

    current += char;
  }

  const token = current.trim();

  if (token) result.push(token);

  return result;
};

const normalizeIpToken = (value: string): string | undefined => {
  let candidate = value.trim();

  if (!candidate) return undefined;

  if (candidate.toLowerCase().startsWith('for=')) {
    candidate = candidate.slice(4).trim();
  }

  if (
    (candidate.startsWith('"') && candidate.endsWith('"')) ||
    (candidate.startsWith("'") && candidate.endsWith("'"))
  ) {
    candidate = candidate.slice(1, -1).trim();
  }

  if (!candidate || candidate === 'unknown' || candidate === '_') {
    return undefined;
  }

  if (candidate.startsWith('[')) {
    const closingBracket = candidate.indexOf(']');

    if (closingBracket !== -1) {
      candidate = candidate.slice(1, closingBracket).trim();
    }
  }

  const ipv4WithPortMatch = candidate.match(/^((?:\d{1,3}\.){3}\d{1,3}):\d+$/);

  if (ipv4WithPortMatch) {
    candidate = ipv4WithPortMatch[1] ?? candidate;
  }

  const mappedIPv4Match = candidate.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);

  if (mappedIPv4Match) {
    candidate = mappedIPv4Match[1] ?? candidate;
  }

  if (candidate === '::1') {
    candidate = '127.0.0.1';
  }

  if (!ipaddr.isValid(candidate)) {
    return undefined;
  }

  return ipaddr.parse(candidate).toString();
};

const isPublicIp = (ip: string): boolean => {
  try {
    const parsed = ipaddr.parse(ip);

    return !PRIVATE_IP_RANGES.has(parsed.range());
  } catch {
    return false;
  }
};

const extractForwardedForCandidates = (headerValue: string): string[] => {
  const entries = splitCommaSeparated(headerValue);
  const candidates: string[] = [];

  for (const entry of entries) {
    for (const parameter of entry.split(';')) {
      const trimmed = parameter.trim();

      if (!trimmed.toLowerCase().startsWith('for=')) continue;

      candidates.push(trimmed.slice(4));
    }
  }

  return candidates;
};

const pickBestIpCandidate = (candidates: string[]): string | undefined => {
  const normalized = candidates
    .map((candidate) => normalizeIpToken(candidate))
    .filter((candidate): candidate is string => Boolean(candidate));

  if (!normalized.length) return undefined;

  return normalized.find((candidate) => isPublicIp(candidate)) ?? normalized[0];
};

const getWsIp = (
  ws: any | undefined,
  req: http.IncomingMessage
): string | undefined => {
  const headers = req?.headers || {};

  const directHeaderCandidates = [
    getHeaderValue(headers, 'cf-connecting-ip'),
    getHeaderValue(headers, 'true-client-ip'),
    getHeaderValue(headers, 'cf-real-ip'),
    getHeaderValue(headers, 'x-real-ip'),
    getHeaderValue(headers, 'x-client-ip'),
    getHeaderValue(headers, 'x-cluster-client-ip'),
    getHeaderValue(headers, 'fly-client-ip'),
    getHeaderValue(headers, 'fastly-client-ip')
  ].filter((value): value is string => Boolean(value));

  for (const value of directHeaderCandidates) {
    const ip = pickBestIpCandidate(splitCommaSeparated(value));

    if (ip) return ip;
  }

  const xForwardedFor = getHeaderValue(headers, 'x-forwarded-for');

  if (xForwardedFor) {
    const ip = pickBestIpCandidate(splitCommaSeparated(xForwardedFor));

    if (ip) return ip;
  }

  const forwardedFor = getHeaderValue(headers, 'forwarded-for');

  if (forwardedFor) {
    const ip = pickBestIpCandidate(splitCommaSeparated(forwardedFor));

    if (ip) return ip;
  }

  const forwarded = getHeaderValue(headers, 'forwarded');

  if (forwarded) {
    const ip = pickBestIpCandidate(extractForwardedForCandidates(forwarded));

    if (ip) return ip;
  }

  return pickBestIpCandidate(
    [
      ws?._socket?.remoteAddress,
      ws?.socket?.remoteAddress,
      req?.socket?.remoteAddress,
      req?.connection?.remoteAddress
    ].filter((value): value is string => Boolean(value))
  );
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
