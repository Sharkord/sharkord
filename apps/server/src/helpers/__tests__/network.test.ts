import { describe, expect, test } from 'bun:test';
import { isPrivateIP, isPublicIp } from '../network';

// this predicate is the whole of the link preview's ssrf defence: everything it calls public
// gets fetched by the server, from the server's own network position
describe('isPublicIp', () => {
  const publicAddresses = [
    '8.8.8.8',
    '93.184.216.34',
    '1.1.1.1',
    '2606:2800:220:1:248:1893:25c8:1946'
  ];

  const blockedAddresses = [
    ['10.0.0.1', 'private class a'],
    ['172.16.0.1', 'private class b'],
    ['172.31.255.254', 'top of private class b'],
    ['192.168.1.1', 'private class c'],
    ['127.0.0.1', 'loopback'],
    ['169.254.169.254', 'link local, the cloud metadata endpoint'],
    ['100.64.0.1', 'carrier grade nat'],
    ['100.127.255.255', 'top of carrier grade nat'],
    ['0.0.0.0', 'unspecified'],
    ['224.0.0.1', 'multicast'],
    ['240.0.0.1', 'reserved'],
    ['255.255.255.255', 'broadcast'],
    ['192.0.2.1', 'documentation'],
    ['198.18.0.1', 'benchmarking'],
    ['::1', 'ipv6 loopback'],
    ['fc00::1', 'ipv6 unique local'],
    ['fe80::1', 'ipv6 link local'],
    ['::', 'ipv6 unspecified']
  ] as const;

  // an address that cannot be parsed must not be treated as routable
  const malformedAddresses = [
    '',
    'not-an-ip',
    '999.999.999.999',
    '10.0.0.1:80',
    'http://10.0.0.1',
    '10.0.0',
    ' 10.0.0.1 '
  ];

  test('should accept routable addresses', () => {
    for (const address of publicAddresses) {
      expect(isPublicIp(address), address).toBe(true);
      expect(isPrivateIP(address), address).toBe(false);
    }
  });

  test('should refuse every reserved range', () => {
    for (const [address, label] of blockedAddresses) {
      expect(isPublicIp(address), label).toBe(false);
      expect(isPrivateIP(address), label).toBe(true);
    }
  });

  // the allowlist refuses mapped addresses outright, since their range is ipv4Mapped rather
  // than unicast. the unwrapping branch exists to let the routable ones back through, and this
  // is what stops that branch from being widened into a way past the ipv4 rules
  test('should refuse a private address wearing an ipv6 mapping', () => {
    expect(isPublicIp('::ffff:10.0.0.1')).toBe(false);
    expect(isPublicIp('::ffff:127.0.0.1')).toBe(false);
    expect(isPublicIp('::ffff:169.254.169.254')).toBe(false);
    expect(isPublicIp('::ffff:100.64.0.1')).toBe(false);
  });

  test('should still accept a routable address wearing an ipv6 mapping', () => {
    expect(isPublicIp('::ffff:8.8.8.8')).toBe(true);
  });

  test('should fail closed on anything it cannot parse', () => {
    for (const address of malformedAddresses) {
      expect(isPublicIp(address), JSON.stringify(address)).toBe(false);
    }
  });
});
