import { lookup } from 'dns/promises';
import ipaddr from 'ipaddr.js';
import os from 'os';

const getPrivateIp = async () => {
  const interfaces = os.networkInterfaces();
  const addresses = Object.values(interfaces)
    .flat()
    .filter((iface) => iface?.family === 'IPv4' && !iface.internal)
    .map((iface) => iface?.address);

  return addresses[0];
};

// every lookup is a third party call on the boot path, so it must be bounded
const PUBLIC_IP_TIMEOUT_MS = 3000;

const fetchWithTimeout = async (url: string): Promise<Response> =>
  fetch(url, { signal: AbortSignal.timeout(PUBLIC_IP_TIMEOUT_MS) });

const getPublicIpFromIpify = async (): Promise<string | undefined> => {
  try {
    const response = await fetchWithTimeout(
      'https://api.ipify.org?format=json'
    );
    const data = (await response.json()) as {
      ip: string;
    };

    return data.ip;
  } catch {
    return undefined;
  }
};

// fallback since it can return ipv6 sometimes
const getPublicIpFromIfconfig = async (): Promise<string | undefined> => {
  try {
    const response = await fetchWithTimeout('https://ifconfig.me/ip');
    const ip = (await response.text()).trim();

    return ip;
  } catch {
    return undefined;
  }
};

const getPublicIpFromIcanhazip = async (): Promise<string | undefined> => {
  try {
    const response = await fetchWithTimeout('https://ipv4.icanhazip.com');
    const ip = (await response.text()).trim();

    return ip;
  } catch {
    return undefined;
  }
};

const getPublicIp = async () => {
  let ip = await getPublicIpFromIcanhazip();

  if (!ip) {
    ip = await getPublicIpFromIpify();
  }

  if (!ip) {
    ip = await getPublicIpFromIfconfig();
  }

  if (!ip) {
    // logger imports config, which imports this file, so console keeps the
    // boot path free of a circular import
    console.warn(
      'Could not determine the public IP address from any provider. Set webRtc.announcedAddress in config.ini if voice does not work.'
    );
  }

  return ip;
};

type THostnameLookup = (
  hostname: string,
  family?: 4 | 6
) => Promise<string | undefined>;

const lookupFamily = async (hostname: string, family: 4 | 6) => {
  try {
    const { address } = await lookup(hostname, { family });

    return address;
  } catch {
    return undefined;
  }
};

const lookupHostname: THostnameLookup = async (hostname, family) => {
  if (family) return lookupFamily(hostname, family);

  const ipv4 = await lookupFamily(hostname, 4);

  if (ipv4) return ipv4;

  return lookupFamily(hostname, 6);
};

const isIpOfFamily = (address: string, kind: 'ipv4' | 'ipv6') => {
  if (!ipaddr.isValid(address)) return false;

  const parsed = ipaddr.parse(address);

  return parsed.kind() === kind;
};

// webRtc.announcedAddress may be an ipv4, a hostname (e.g. a ddns record) or empty.
// a hostname is resolved once at boot so mediasoup announces a plain ip in its ice
// candidates, browsers do not reliably resolve hostname candidates themselves.
// it is announced on the ipv4 listener, so an ipv6 address here could never be reached.
// empty, or a hostname without an a record, falls back to the public ip providers
const resolveAnnouncedAddress = async (
  announcedAddress: string,
  resolveHostname: THostnameLookup = lookupHostname
): Promise<string | undefined> => {
  const address = announcedAddress.trim();

  if (!address) return getPublicIp();

  if (isIpOfFamily(address, 'ipv4')) return address;

  if (ipaddr.isValid(address)) {
    console.warn(
      `webRtc.announcedAddress "${address}" is not an IPv4 address, set it in webRtc.announcedAddressV6 instead. Falling back to public IP lookup.`
    );

    return getPublicIp();
  }

  const resolved = await resolveHostname(address, 4);

  if (resolved) return resolved;

  console.warn(
    `Could not resolve webRtc.announcedAddress hostname "${address}" to an IPv4 address, falling back to public IP lookup.`
  );

  return getPublicIp();
};

// ipv6 is opt in: an empty value keeps the server ipv4 only, and anything that does not
// give an ipv6 address turns it off too rather than guessing one
const resolveAnnouncedAddressV6 = async (
  announcedAddressV6: string,
  resolveHostname: THostnameLookup = lookupHostname
): Promise<string | undefined> => {
  const address = announcedAddressV6.trim();

  if (!address) return undefined;

  if (isIpOfFamily(address, 'ipv6')) return address;

  if (ipaddr.isValid(address)) {
    console.warn(
      `webRtc.announcedAddressV6 "${address}" is not an IPv6 address, IPv6 voice is disabled.`
    );

    return undefined;
  }

  const resolved = await resolveHostname(address, 6);

  if (!resolved) {
    console.warn(
      `Could not resolve webRtc.announcedAddressV6 hostname "${address}" to an IPv6 address, IPv6 voice is disabled.`
    );
  }

  return resolved;
};

// unlike announcedAddress there is nothing to fall back to: an empty value turns the
// internal candidate off, and so does a hostname that does not resolve
const resolveInternalAnnouncedAddress = async (
  internalAnnouncedAddress: string,
  resolveHostname: THostnameLookup = lookupHostname
): Promise<string | undefined> => {
  const address = internalAnnouncedAddress.trim();

  if (!address) return undefined;

  if (ipaddr.isValid(address)) return address;

  const resolved = await resolveHostname(address);

  if (!resolved) {
    // logger imports config, which imports this file, see getPublicIp
    console.warn(
      `Could not resolve webRtc.internalAnnouncedAddress hostname "${address}", internal clients will use webRtc.announcedAddress.`
    );
  }

  return resolved;
};

// the single answer to "is this a routable public address". an allowlist of one range
// rather than a blocklist, so anything ipaddr does not call unicast (carrierGradeNat,
// reserved, benchmarking and friends) is treated as not public. an unparseable address is
// not public either, which is what makes isPrivateIP below fail closed
const isPublicIp = (ip: string): boolean => {
  try {
    const parsed = ipaddr.parse(ip);

    if (parsed.kind() === 'ipv6') {
      const v6 = parsed as ipaddr.IPv6;

      if (v6.isIPv4MappedAddress())
        return v6.toIPv4Address().range() === 'unicast';
    }

    return parsed.range() === 'unicast';
  } catch {
    return false;
  }
};

const isPrivateIP = (ip: string): boolean => !isPublicIp(ip);

const getIpBlockKey = (ip: string): string => {
  if (!ipaddr.isValid(ip)) return ip;

  const address = ipaddr.process(ip);

  if (address.kind() === 'ipv4') return address.toString();

  const cidr = `${address.toString()}/64`;
  const network = ipaddr.IPv6.networkAddressFromCIDR(cidr);

  return `${network.toString()}/64`;
};

export {
  getIpBlockKey,
  getPrivateIp,
  getPublicIp,
  isIpOfFamily,
  isPrivateIP,
  isPublicIp,
  resolveAnnouncedAddress,
  resolveAnnouncedAddressV6,
  resolveInternalAnnouncedAddress
};
