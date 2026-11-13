import { beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import {
  getIpBlockKey,
  isPrivateIP,
  isPublicIp,
  resolveAnnouncedAddress,
  resolveAnnouncedAddressV6,
  resolveInternalAnnouncedAddress
} from '../network';

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

describe('getIpBlockKey', () => {
  test('keeps an ipv4 address as it is', () => {
    expect(getIpBlockKey('1.2.3.4')).toBe('1.2.3.4');
  });

  test('normalizes mapped ipv4 addresses without grouping different clients', () => {
    expect(getIpBlockKey('::ffff:1.2.3.4')).toBe('1.2.3.4');
    expect(getIpBlockKey('::ffff:9.9.9.9')).toBe('9.9.9.9');
    expect(getIpBlockKey('0:0:0:0:0:ffff:102:304')).toBe('1.2.3.4');
    expect(getIpBlockKey('::1')).toBe('::/64');
  });

  test('groups ipv6 addresses by their /64', () => {
    expect(getIpBlockKey('2001:db8:1:2:aaaa::1')).toBe('2001:db8:1:2::/64');
    expect(getIpBlockKey('2001:db8:1:2:bbbb::2')).toBe('2001:db8:1:2::/64');
    expect(getIpBlockKey('2001:db8:1:3::1')).toBe('2001:db8:1:3::/64');
  });

  test('returns anything unparseable unchanged', () => {
    expect(getIpBlockKey('unknown')).toBe('unknown');
  });
});

describe('resolveAnnouncedAddress', () => {
  // the global afterEach in setup.ts calls mock.restore(), so the spy has to be
  // recreated per test or every test after the first reaches the real providers
  let fetchSpy: ReturnType<typeof spyOn<typeof globalThis, 'fetch'>>;

  beforeEach(() => {
    fetchSpy = spyOn(globalThis, 'fetch').mockImplementation((async () => {
      throw new Error('unexpected network call');
    }) as unknown as typeof fetch);
  });

  test('returns an ipv4 address as is without any lookup', async () => {
    const lookup = mock(async () => '9.9.9.9');

    expect(await resolveAnnouncedAddress('203.0.113.7', lookup)).toBe(
      '203.0.113.7'
    );
    expect(lookup).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // it is announced on the ipv4 listener, where an ipv6 address can never be reached
  test('refuses an ipv6 address and falls back to the public ip providers', async () => {
    const warnSpy = spyOn(console, 'warn').mockImplementation(() => {});
    const lookup = mock(async () => '9.9.9.9');

    fetchSpy.mockImplementation(
      (async () => new Response('192.0.2.52\n')) as unknown as typeof fetch
    );

    expect(await resolveAnnouncedAddress('2001:db8::1', lookup)).toBe(
      '192.0.2.52'
    );
    expect(lookup).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('webRtc.announcedAddressV6')
    );
  });

  test('resolves a hostname to its ipv4 address through dns', async () => {
    const lookup = mock(async () => '198.51.100.20');

    expect(await resolveAnnouncedAddress(' voice.example.com ', lookup)).toBe(
      '198.51.100.20'
    );
    expect(lookup).toHaveBeenCalledWith('voice.example.com', 4);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('falls back to the public ip providers when the hostname does not resolve', async () => {
    spyOn(console, 'warn').mockImplementation(() => {});
    const lookup = mock(async () => undefined);

    fetchSpy.mockImplementation(
      (async () => new Response('192.0.2.50\n')) as unknown as typeof fetch
    );

    expect(await resolveAnnouncedAddress('nope.invalid', lookup)).toBe(
      '192.0.2.50'
    );
    expect(lookup).toHaveBeenCalledWith('nope.invalid', 4);
    expect(fetchSpy).toHaveBeenCalled();
  });

  test('uses the public ip providers when no address is configured', async () => {
    const lookup = mock(async () => '9.9.9.9');

    fetchSpy.mockImplementation(
      (async () => new Response('192.0.2.51\n')) as unknown as typeof fetch
    );

    expect(await resolveAnnouncedAddress('', lookup)).toBe('192.0.2.51');
    expect(lookup).not.toHaveBeenCalled();
  });
});

describe('resolveAnnouncedAddressV6', () => {
  let fetchSpy: ReturnType<typeof spyOn<typeof globalThis, 'fetch'>>;

  beforeEach(() => {
    fetchSpy = spyOn(globalThis, 'fetch').mockImplementation((async () => {
      throw new Error('unexpected network call');
    }) as unknown as typeof fetch);
  });

  test('is off when empty, without any lookup', async () => {
    const lookup = mock(async () => '2001:db8::1');

    expect(await resolveAnnouncedAddressV6('  ', lookup)).toBeUndefined();
    expect(lookup).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('returns an ipv6 address as is without any lookup', async () => {
    const lookup = mock(async () => '2001:db8::9');

    expect(await resolveAnnouncedAddressV6('2001:db8::1', lookup)).toBe(
      '2001:db8::1'
    );
    expect(lookup).not.toHaveBeenCalled();
  });

  test('is off when given an ipv4 address', async () => {
    const warnSpy = spyOn(console, 'warn').mockImplementation(() => {});
    const lookup = mock(async () => '2001:db8::1');

    expect(
      await resolveAnnouncedAddressV6('203.0.113.7', lookup)
    ).toBeUndefined();
    expect(lookup).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
  });

  test('resolves a hostname to its ipv6 address through dns', async () => {
    const lookup = mock(async () => '2001:db8::20');

    expect(await resolveAnnouncedAddressV6(' voice.example.com ', lookup)).toBe(
      '2001:db8::20'
    );
    expect(lookup).toHaveBeenCalledWith('voice.example.com', 6);
  });

  // the public ip providers only return ipv4, so there is nothing to fall back to
  test('is off when the hostname has no ipv6 address', async () => {
    const warnSpy = spyOn(console, 'warn').mockImplementation(() => {});
    const lookup = mock(async () => undefined);

    expect(
      await resolveAnnouncedAddressV6('voice.example.com', lookup)
    ).toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('resolveInternalAnnouncedAddress', () => {
  test('is off when empty, without any lookup', async () => {
    const lookup = mock(async () => '192.168.1.10');

    expect(await resolveInternalAnnouncedAddress('  ', lookup)).toBeUndefined();
    expect(lookup).not.toHaveBeenCalled();
  });

  test('returns an ip as is without any lookup', async () => {
    const lookup = mock(async () => '9.9.9.9');

    expect(await resolveInternalAnnouncedAddress('192.168.1.10', lookup)).toBe(
      '192.168.1.10'
    );
    expect(lookup).not.toHaveBeenCalled();
  });

  test('resolves a hostname through dns', async () => {
    const lookup = mock(async () => '192.168.1.10');

    expect(
      await resolveInternalAnnouncedAddress(' sharkord.lan ', lookup)
    ).toBe('192.168.1.10');
    expect(lookup).toHaveBeenCalledWith('sharkord.lan');
  });

  // falling back to the public ip like announcedAddress does would just announce
  // the public candidate twice
  test('is off when the hostname does not resolve', async () => {
    const warnSpy = spyOn(console, 'warn').mockImplementation(() => {});
    const lookup = mock(async () => undefined);

    expect(
      await resolveInternalAnnouncedAddress('sharkord.lan', lookup)
    ).toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();
  });
});
