import { describe, expect, test } from 'bun:test';
import type http from 'http';
import {
  getForwardedIp,
  getWsInfo,
  isTrustedProxyAddress
} from '../get-ws-info';

const createRequest = ({
  headers = {},
  remoteAddress
}: {
  headers?: http.IncomingHttpHeaders;
  remoteAddress?: string;
} = {}) => {
  return {
    headers,
    socket: { remoteAddress },
    connection: { remoteAddress }
  } as unknown as http.IncomingMessage;
};

// forwarded headers are only read when the connection comes from a configured
// trusted proxy, so the parsing cases below exercise getForwardedIp directly
// and fall through to the real resolution when no header is present. the trust
// gate itself is covered by the 'trusted proxy gate' block at the bottom
const ipOf = (
  ws: any,
  req: http.IncomingMessage,
  trustedProxies: string[] = []
): string | undefined =>
  getForwardedIp(req?.headers ?? {}, trustedProxies) ?? getWsInfo(ws, req)?.ip;

describe('getWsInfo - ip resolution', () => {
  describe('header priority', () => {
    test('ignores single-value vendor headers in favour of the chain', () => {
      const req = createRequest({
        headers: {
          'cf-connecting-ip': '203.0.113.14',
          'x-forwarded-for': '198.51.100.1'
        }
      });

      expect(ipOf(undefined, req)).toBe('198.51.100.1');
    });

    test('falls back to the socket when only a vendor header is present', () => {
      const req = createRequest({
        headers: {
          'cf-connecting-ip': '203.0.113.14',
          'true-client-ip': '198.51.100.50'
        },
        remoteAddress: '127.0.0.1'
      });

      expect(ipOf(undefined, req)).toBe('127.0.0.1');
    });

    test('prefers x-forwarded-for over RFC 7239 Forwarded', () => {
      const req = createRequest({
        headers: {
          'x-forwarded-for': '203.0.113.77',
          forwarded: 'for=198.51.100.1'
        }
      });

      expect(ipOf(undefined, req)).toBe('203.0.113.77');
    });

    test('prefers RFC 7239 Forwarded over socket address', () => {
      const req = createRequest({
        headers: {
          forwarded: 'for=203.0.113.88'
        },
        remoteAddress: '127.0.0.1'
      });

      expect(ipOf(undefined, req)).toBe('203.0.113.88');
    });

    test('falls back to request socket when all headers are absent', () => {
      const req = createRequest({ remoteAddress: '198.51.100.33' });

      expect(ipOf(undefined, req)).toBe('198.51.100.33');
    });

    test('falls back to request socket when proxy headers contain garbage', () => {
      const req = createRequest({
        headers: {
          'x-forwarded-for': 'unknown, garbage, not-an-ip'
        },
        remoteAddress: '198.51.100.33'
      });

      expect(ipOf(undefined, req)).toBe('198.51.100.33');
    });
  });

  describe('x-forwarded-for', () => {
    test('takes the right-most entry when no proxies are trusted', () => {
      const req = createRequest({
        headers: {
          'x-forwarded-for': '10.0.0.4, 172.19.4.2, 93.184.216.34'
        }
      });

      expect(ipOf(undefined, req)).toBe('93.184.216.34');
    });

    // the shape nginx produces with the standard `$proxy_add_x_forwarded_for`:
    // whatever the client sent, then the address it connected from
    test('ignores an entry the client prepended itself', () => {
      const req = createRequest({
        headers: { 'x-forwarded-for': '1.2.3.4, 198.51.100.7' }
      });

      expect(ipOf(undefined, req)).toBe('198.51.100.7');
    });

    test('walks past our own proxies from the right', () => {
      const req = createRequest({
        headers: {
          'x-forwarded-for': '93.184.216.34, 10.0.0.4, 172.19.4.2'
        }
      });

      expect(ipOf(undefined, req, ['10.0.0.0/8', '172.16.0.0/12'])).toBe(
        '93.184.216.34'
      );
    });

    test('returns the left-most entry when the whole chain is trusted', () => {
      const req = createRequest({
        headers: { 'x-forwarded-for': '10.0.0.4, 10.0.0.5' }
      });

      expect(ipOf(undefined, req, ['10.0.0.0/8'])).toBe('10.0.0.4');
    });

    test('returns a private address when the chain has no public one', () => {
      const req = createRequest({
        headers: {
          'x-forwarded-for': '10.0.0.4, 192.168.1.1'
        }
      });

      expect(ipOf(undefined, req)).toBe('192.168.1.1');
    });

    test('handles single ip value', () => {
      const req = createRequest({
        headers: { 'x-forwarded-for': '93.184.216.34' }
      });

      expect(ipOf(undefined, req)).toBe('93.184.216.34');
    });

    test('ignores empty segments', () => {
      const req = createRequest({
        headers: { 'x-forwarded-for': ', , 93.184.216.34, , ' }
      });

      expect(ipOf(undefined, req)).toBe('93.184.216.34');
    });
  });

  describe('RFC 7239 Forwarded', () => {
    test('parses quoted ipv6 with port', () => {
      const req = createRequest({
        headers: {
          forwarded:
            'for="[2001:db8:cafe::17]:4711";proto=https;by=203.0.113.43'
        }
      });

      expect(ipOf(undefined, req)).toBe('2001:db8:cafe::17');
    });

    test('parses simple ipv4 for= directive', () => {
      const req = createRequest({
        headers: { forwarded: 'for=198.51.100.1;proto=http' }
      });

      expect(ipOf(undefined, req)).toBe('198.51.100.1');
    });

    test('handles multiple comma-separated Forwarded entries', () => {
      const req = createRequest({
        headers: {
          forwarded: 'for=10.0.0.1, for=93.184.216.34;proto=https'
        }
      });

      // the right-most entry, same rule as x-forwarded-for
      expect(ipOf(undefined, req)).toBe('93.184.216.34');
    });

    test('handles case-insensitive for= prefix', () => {
      const req = createRequest({
        headers: { forwarded: 'For=198.51.100.22' }
      });

      expect(ipOf(undefined, req)).toBe('198.51.100.22');
    });
  });

  describe('IP normalization', () => {
    test('normalizes IPv4-mapped IPv6 from websocket socket', () => {
      const req = createRequest({});
      const ws = { _socket: { remoteAddress: '::ffff:127.0.0.1' } };

      expect(ipOf(ws, req)).toBe('127.0.0.1');
    });

    test('normalizes IPv4-mapped IPv6 from x-forwarded-for', () => {
      const req = createRequest({
        headers: { 'x-forwarded-for': '::ffff:93.184.216.34' }
      });

      expect(ipOf(undefined, req)).toBe('93.184.216.34');
    });

    test('strips port from IPv4 address', () => {
      const req = createRequest({
        headers: { 'x-forwarded-for': '198.51.100.5:8080' }
      });

      expect(ipOf(undefined, req)).toBe('198.51.100.5');
    });

    test('handles bracketed IPv6 without port', () => {
      const req = createRequest({
        headers: { forwarded: 'for="[2001:db8::1]"' }
      });

      expect(ipOf(undefined, req)).toBe('2001:db8::1');
    });

    test('handles bracketed IPv6 with port', () => {
      const req = createRequest({
        headers: { forwarded: 'for="[2001:db8::1]:443"' }
      });

      expect(ipOf(undefined, req)).toBe('2001:db8::1');
    });

    test('preserves valid plain IPv6 address', () => {
      const req = createRequest({
        headers: { 'x-forwarded-for': '2001:db8::1' }
      });

      expect(ipOf(undefined, req)).toBe('2001:db8::1');
    });

    test('does not mangle IPv6 addresses with embedded dots (mixed notation mapped)', () => {
      const req = createRequest({
        headers: { 'x-forwarded-for': '::ffff:192.0.2.1' }
      });

      expect(ipOf(undefined, req)).toBe('192.0.2.1');
    });
  });

  describe('array-valued headers', () => {
    test('joins array values into comma-separated list', () => {
      const req = createRequest({
        headers: { 'x-forwarded-for': ['198.51.100.77'] }
      });

      expect(ipOf(undefined, req)).toBe('198.51.100.77');
    });

    test('handles multiple values in array', () => {
      const req = createRequest({
        headers: {
          'x-forwarded-for': ['10.0.0.1', '93.184.216.34']
        }
      });

      expect(ipOf(undefined, req)).toBe('93.184.216.34');
    });
  });

  describe('websocket socket fallback', () => {
    test('reads from ws._socket.remoteAddress', () => {
      const req = createRequest({});
      const ws = { _socket: { remoteAddress: '198.51.100.99' } };

      expect(ipOf(ws, req)).toBe('198.51.100.99');
    });

    test('reads from ws.socket.remoteAddress as second fallback', () => {
      const req = createRequest({});
      const ws = { socket: { remoteAddress: '198.51.100.88' } };

      expect(ipOf(ws, req)).toBe('198.51.100.88');
    });

    test('prefers ws._socket over ws.socket', () => {
      const req = createRequest({});
      const ws = {
        _socket: { remoteAddress: '198.51.100.1' },
        socket: { remoteAddress: '198.51.100.2' }
      };

      // pickBestIp gets both; both are public so first wins
      expect(ipOf(ws, req)).toBe('198.51.100.1');
    });

    test('reads from req.socket.remoteAddress as last resort', () => {
      const req = createRequest({ remoteAddress: '198.51.100.77' });

      expect(ipOf(undefined, req)).toBe('198.51.100.77');
    });
  });

  describe('robustness', () => {
    test('returns undefined when no info is available at all', () => {
      const req = createRequest({});

      expect(getWsInfo(undefined, req)).toBeUndefined();
    });

    test('returns undefined when both ws and req are undefined', () => {
      expect(getWsInfo(undefined, undefined)).toBeUndefined();
    });

    test('handles completely empty headers object', () => {
      const req = createRequest({ headers: {} });

      expect(getWsInfo(undefined, req)).toBeUndefined();
    });

    test('discards oversized header values (DoS protection)', () => {
      const hugeValue = '198.51.100.1, '.repeat(500);
      const req = createRequest({
        headers: { 'x-forwarded-for': hugeValue },
        remoteAddress: '127.0.0.1'
      });

      // The oversized x-forwarded-for should be discarded, falling back to socket
      expect(ipOf(undefined, req)).toBe('127.0.0.1');
    });

    test('handles invalid IP strings gracefully', () => {
      const req = createRequest({
        headers: { 'x-forwarded-for': 'not-an-ip-at-all' },
        remoteAddress: '127.0.0.1'
      });

      expect(ipOf(undefined, req)).toBe('127.0.0.1');
    });

    test('handles header with only whitespace', () => {
      const req = createRequest({
        headers: { 'x-forwarded-for': '   ' },
        remoteAddress: '127.0.0.1'
      });

      expect(ipOf(undefined, req)).toBe('127.0.0.1');
    });

    test('handles header with empty array', () => {
      const req = createRequest({
        headers: { 'x-forwarded-for': [] as unknown as string[] },
        remoteAddress: '198.51.100.1'
      });

      expect(ipOf(undefined, req)).toBe('198.51.100.1');
    });

    test('truncates candidate list to prevent abuse from long chains', () => {
      // 50 IPs in chain, only the 25th is public
      const ips = Array.from({ length: 50 }, (_, i) =>
        i === 24 ? '203.0.113.1' : `10.0.0.${i % 256}`
      );
      const req = createRequest({
        headers: { 'x-forwarded-for': ips.join(', ') }
      });

      const result = ipOf(undefined, req);
      // MAX_IP_CANDIDATES is 20, so index 24 is beyond the limit and the
      // right-most entry that survives the truncation is index 19
      expect(result).toBe('10.0.0.19');
    });
  });
});

describe('getWsInfo - user-agent parsing', () => {
  test('parses OS name and version from user-agent', () => {
    const req = createRequest({
      headers: {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      remoteAddress: '127.0.0.1'
    });

    const result = getWsInfo(undefined, req);

    expect(result?.os).toBe('Windows 10');
  });

  test('sets device to Desktop for non-mobile user-agents', () => {
    const req = createRequest({
      headers: {
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      remoteAddress: '127.0.0.1'
    });

    const result = getWsInfo(undefined, req);

    expect(result?.device).toBe('Desktop');
  });

  test('parses mobile device info', () => {
    const req = createRequest({
      headers: {
        'user-agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
      },
      remoteAddress: '127.0.0.1'
    });

    const result = getWsInfo(undefined, req);

    expect(result?.os).toBe('iOS 16.0');
    expect(result?.device).toBe('Apple iPhone');
  });

  test('returns userAgent string when present', () => {
    const ua = 'CustomBot/1.0';
    const req = createRequest({
      headers: { 'user-agent': ua },
      remoteAddress: '127.0.0.1'
    });

    const result = getWsInfo(undefined, req);

    expect(result?.userAgent).toBe(ua);
  });

  test('returns ip even when user-agent is missing', () => {
    const req = createRequest({ remoteAddress: '198.51.100.1' });

    const result = getWsInfo(undefined, req);

    expect(result?.ip).toBe('198.51.100.1');
    expect(result?.userAgent).toBeUndefined();
    expect(result?.os).toBeUndefined();
    expect(result?.device).toBeUndefined();
  });

  test('returns user-agent info even when ip is unavailable', () => {
    const req = createRequest({
      headers: {
        'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
      }
    });

    const result = getWsInfo(undefined, req);

    expect(result?.ip).toBeUndefined();
    expect(result?.userAgent).toBeDefined();
    expect(result?.os).toBe('Linux');
  });

  test('handles empty user-agent string', () => {
    const req = createRequest({
      headers: { 'user-agent': '' },
      remoteAddress: '198.51.100.1'
    });

    const result = getWsInfo(undefined, req);

    expect(result?.ip).toBe('198.51.100.1');
    expect(result?.userAgent).toBeUndefined();
  });
});

describe('getWsInfo - return value', () => {
  test('returns all fields when ip and user-agent are present', () => {
    const req = createRequest({
      headers: {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      remoteAddress: '203.0.113.1'
    });

    const result = getWsInfo(undefined, req);

    expect(result).toBeDefined();
    expect(result?.ip).toBe('203.0.113.1');
    expect(result?.os).toBe('Windows 10');
    expect(result?.device).toBe('Desktop');
    expect(result?.userAgent).toContain('Windows NT');
  });

  test('result shape has only expected keys', () => {
    const req = createRequest({
      headers: { 'user-agent': 'TestBot/1.0' },
      remoteAddress: '203.0.113.1'
    });

    const result = getWsInfo(undefined, req);
    const keys = Object.keys(result!).sort();

    expect(keys).toEqual(['device', 'ip', 'os', 'userAgent']);
  });
});

describe('getWsInfo - trusted proxy gate', () => {
  // config.server.trustedProxies is empty by default, so a direct connection
  // must never be able to pick its own ip through headers
  test('ignores forwarded headers when the socket is not a trusted proxy', () => {
    const req = createRequest({
      headers: {
        'x-real-ip': '1.2.3.4',
        'x-forwarded-for': '5.6.7.8',
        'cf-connecting-ip': '9.10.11.12'
      },
      remoteAddress: '198.51.100.7'
    });

    expect(getWsInfo(undefined, req)?.ip).toBe('198.51.100.7');
  });

  test('ignores forwarded headers when there is no socket address', () => {
    const req = createRequest({ headers: { 'x-real-ip': '1.2.3.4' } });

    expect(getWsInfo(undefined, req)?.ip).toBeUndefined();
  });

  describe('isTrustedProxyAddress', () => {
    test('returns false when no proxies are configured', () => {
      expect(isTrustedProxyAddress('10.0.0.1', [])).toBe(false);
    });

    test('returns false for an undefined address', () => {
      expect(isTrustedProxyAddress(undefined, ['10.0.0.1'])).toBe(false);
    });

    test('matches an exact ipv4 entry', () => {
      expect(isTrustedProxyAddress('10.0.0.1', ['10.0.0.1'])).toBe(true);
      expect(isTrustedProxyAddress('10.0.0.2', ['10.0.0.1'])).toBe(false);
    });

    test('matches an ipv4 cidr range', () => {
      expect(isTrustedProxyAddress('10.0.3.9', ['10.0.0.0/16'])).toBe(true);
      expect(isTrustedProxyAddress('10.1.0.1', ['10.0.0.0/16'])).toBe(false);
    });

    test('matches an ipv6 cidr range', () => {
      expect(isTrustedProxyAddress('2001:db8::5', ['2001:db8::/32'])).toBe(
        true
      );
      expect(isTrustedProxyAddress('2001:db9::5', ['2001:db8::/32'])).toBe(
        false
      );
    });

    test('does not match an ipv4 address against an ipv6 range', () => {
      expect(isTrustedProxyAddress('10.0.0.1', ['2001:db8::/32'])).toBe(false);
    });

    test('matches loopback for a local reverse proxy', () => {
      expect(isTrustedProxyAddress('127.0.0.1', ['127.0.0.1'])).toBe(true);
    });

    test('ignores malformed entries instead of throwing', () => {
      expect(isTrustedProxyAddress('10.0.0.1', ['not-an-ip', '10.0.0.1'])).toBe(
        true
      );
      expect(isTrustedProxyAddress('10.0.0.1', ['10.0.0.0/999'])).toBe(false);
    });

    test('matches any address when the range covers everything', () => {
      expect(isTrustedProxyAddress('203.0.113.9', ['0.0.0.0/0'])).toBe(true);
    });
  });
});
