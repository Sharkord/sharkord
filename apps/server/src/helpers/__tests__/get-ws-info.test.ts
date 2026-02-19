import { describe, expect, test } from 'bun:test';
import type http from 'http';
import { getWsInfo } from '../get-ws-info';

const createRequest = ({
  headers = {},
  remoteAddress
}: {
  headers?: http.IncomingHttpHeaders;
  remoteAddress?: string;
}) => {
  return {
    headers,
    socket: { remoteAddress },
    connection: { remoteAddress }
  } as unknown as http.IncomingMessage;
};

describe('getWsInfo', () => {
  test('prefers CDN client ip headers over forwarded chain', () => {
    const req = createRequest({
      headers: {
        'cf-connecting-ip': '203.0.113.14',
        'x-forwarded-for': '198.51.100.1, 10.0.0.2'
      }
    });

    const result = getWsInfo(undefined, req);

    expect(result?.ip).toBe('203.0.113.14');
  });

  test('selects first public ip from x-forwarded-for', () => {
    const req = createRequest({
      headers: {
        'x-forwarded-for': '10.0.0.4, 172.19.4.2, 93.184.216.34'
      }
    });

    const result = getWsInfo(undefined, req);

    expect(result?.ip).toBe('93.184.216.34');
  });

  test('parses RFC 7239 forwarded header with quoted ipv6 and port', () => {
    const req = createRequest({
      headers: {
        forwarded: 'for="[2001:db8:cafe::17]:4711";proto=https;by=203.0.113.43'
      }
    });

    const result = getWsInfo(undefined, req);

    expect(result?.ip).toBe('2001:db8:cafe::17');
  });

  test('normalizes mapped loopback ipv6 from websocket socket', () => {
    const req = createRequest({});
    const ws = {
      _socket: {
        remoteAddress: '::ffff:127.0.0.1'
      }
    };

    const result = getWsInfo(ws, req);

    expect(result?.ip).toBe('127.0.0.1');
  });

  test('supports array-valued headers', () => {
    const req = createRequest({
      headers: {
        'x-real-ip': ['198.51.100.77']
      }
    });

    const result = getWsInfo(undefined, req);

    expect(result?.ip).toBe('198.51.100.77');
  });

  test('falls back to request socket when proxy headers are invalid', () => {
    const req = createRequest({
      headers: {
        'x-forwarded-for': 'unknown, garbage'
      },
      remoteAddress: '198.51.100.33'
    });

    const result = getWsInfo(undefined, req);

    expect(result?.ip).toBe('198.51.100.33');
  });
});
