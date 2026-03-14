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

const getPublicIpFromIpify = async (): Promise<string | undefined> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
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
    const response = await fetch('https://ifconfig.me/ip');
    const ip = (await response.text()).trim();

    return ip;
  } catch {
    return undefined;
  }
};

const getPublicIpFromIcanhazip = async (): Promise<string | undefined> => {
  try {
    const response = await fetch('https://ipv4.icanhazip.com');
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

  return ip;
};

const isPrivateIP = (ip: string): boolean => {
  try {
    const addr = ipaddr.parse(ip);
    const range = addr.range();

    const blockedRanges = [
      'unspecified',
      'broadcast',
      'multicast',
      'linkLocal',
      'loopback',
      'private',
      'uniqueLocal'
    ];

    return blockedRanges.includes(range);
  } catch {
    return true; // if we can't parse it, block it
  }
};

export { getPrivateIp, getPublicIp, isPrivateIP };
