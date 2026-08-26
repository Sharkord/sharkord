import { describe, expect, test } from 'bun:test';
import { EventEmitter } from 'events';
import type http from 'http';
import { deepFreeze } from '../../config';
import { PayloadTooLargeError } from '../errors';
import {
  getJsonBody,
  getRequestUrl,
  hasPrefixPathSegment,
  parseByteRange
} from '../helpers';

const createMockRequest = (
  url?: string,
  host?: string
): EventEmitter & http.IncomingMessage => {
  const req = new EventEmitter() as EventEmitter & http.IncomingMessage;

  req.url = url;
  req.headers = { host };
  req.destroy = (() => {
    req.emit('close');

    return req;
  }) as http.IncomingMessage['destroy'];

  req.pause = (() => {
    req.emit('pause');

    return req;
  }) as http.IncomingMessage['pause'];

  return req;
};

describe('http helpers', () => {
  describe('hasPrefixPathSegment', () => {
    test('matches exact path and path segment prefixes', () => {
      expect(hasPrefixPathSegment('/public', '/public')).toBe(true);
      expect(hasPrefixPathSegment('/public/file.txt', '/public')).toBe(true);
      expect(
        hasPrefixPathSegment('/plugin-bundle/a/b.js', '/plugin-bundle')
      ).toBe(true);
    });

    test('does not match lookalike prefixes', () => {
      expect(hasPrefixPathSegment('/publicx', '/public')).toBe(false);
      expect(
        hasPrefixPathSegment('/plugin-components-extra', '/plugin-components')
      ).toBe(false);
    });
  });

  describe('getRequestUrl', () => {
    test('returns pathname and ignores query params', () => {
      const req = createMockRequest(
        '/plugin-bundle/plugin-a/server/index.js?v=123',
        'localhost:9999'
      );

      expect(getRequestUrl(req)?.pathname).toBe(
        '/plugin-bundle/plugin-a/server/index.js'
      );
    });

    test('returns null when url is missing', () => {
      const req = createMockRequest(undefined, 'localhost:9999');

      expect(getRequestUrl(req)).toBeNull();
    });

    test('returns null for invalid absolute url', () => {
      const req = createMockRequest('http://[', 'localhost:9999');

      expect(getRequestUrl(req)).toBeNull();
    });
  });

  describe('parseByteRange', () => {
    test('parses a closed range', () => {
      expect(parseByteRange('bytes=0-99', 1000)).toEqual({ start: 0, end: 99 });
    });

    test('treats a missing end as the last byte', () => {
      expect(parseByteRange('bytes=500-', 1000)).toEqual({
        start: 500,
        end: 999
      });
    });

    test('clamps an end past the file instead of refusing it', () => {
      // RFC 7233 requires the clamp, the old implementation answered 416 here
      expect(parseByteRange('bytes=0-99999', 1000)).toEqual({
        start: 0,
        end: 999
      });
    });

    test('supports suffix ranges', () => {
      expect(parseByteRange('bytes=-500', 1000)).toEqual({
        start: 500,
        end: 999
      });
    });

    test('clamps a suffix longer than the file', () => {
      expect(parseByteRange('bytes=-5000', 1000)).toEqual({
        start: 0,
        end: 999
      });
    });

    test('rejects unsatisfiable and malformed ranges', () => {
      expect(parseByteRange('bytes=1000-', 1000)).toBeNull();
      expect(parseByteRange('bytes=900-100', 1000)).toBeNull();
      expect(parseByteRange('bytes=-0', 1000)).toBeNull();
      expect(parseByteRange('bytes=-', 1000)).toBeNull();
      expect(parseByteRange('items=0-10', 1000)).toBeNull();
      expect(parseByteRange('bytes=abc-def', 1000)).toBeNull();
    });

    test('rejects every range on a zero-byte file', () => {
      expect(parseByteRange('bytes=0-', 0)).toBeNull();
      expect(parseByteRange('bytes=0-0', 0)).toBeNull();
    });
  });

  describe('deepFreeze', () => {
    test('freezes nested objects, which a bare Object.freeze does not', () => {
      const frozen = deepFreeze({ server: { port: 4991, nested: { a: 1 } } });

      expect(() => {
        frozen.server.port = 1;
      }).toThrow();

      expect(() => {
        frozen.server.nested.a = 2;
      }).toThrow();

      expect(frozen.server.port).toBe(4991);
    });
  });

  describe('getJsonBody', () => {
    test('parses valid json body', async () => {
      const req = createMockRequest('/login', 'localhost:9999');

      queueMicrotask(() => {
        req.emit('data', '{"identity":"test"}');
        req.emit('end');
      });

      const body = await getJsonBody<{ identity: string }>(req);

      expect(body.identity).toBe('test');
    });

    test('returns empty object when body is empty', async () => {
      const req = createMockRequest('/login', 'localhost:9999');

      queueMicrotask(() => {
        req.emit('end');
      });

      const body = await getJsonBody<Record<string, unknown>>(req);

      expect(body).toEqual({});
    });

    test('rejects for invalid json', async () => {
      const req = createMockRequest('/login', 'localhost:9999');

      queueMicrotask(() => {
        req.emit('data', '{invalid-json');
        req.emit('end');
      });

      await expect(getJsonBody(req)).rejects.toBeInstanceOf(Error);
    });

    test('rejects when request emits an error', async () => {
      const req = createMockRequest('/login', 'localhost:9999');

      queueMicrotask(() => {
        req.emit('error', new Error('request failed'));
      });

      await expect(getJsonBody(req)).rejects.toThrow('request failed');
    });

    test('rejects a body larger than the configured maximum', async () => {
      const req = createMockRequest('/login', 'localhost:9999');

      queueMicrotask(() => {
        req.emit('data', Buffer.alloc(64, 0x61));
        req.emit('end');
      });

      await expect(getJsonBody(req, 32)).rejects.toBeInstanceOf(
        PayloadTooLargeError
      );
    });

    test('rejects once the accumulated size passes the maximum', async () => {
      const req = createMockRequest('/login', 'localhost:9999');

      queueMicrotask(() => {
        req.emit('data', Buffer.alloc(20, 0x61));
        req.emit('data', Buffer.alloc(20, 0x61));
        req.emit('end');
      });

      await expect(getJsonBody(req, 32)).rejects.toBeInstanceOf(
        PayloadTooLargeError
      );
    });

    // destroying it instead would take the socket down before the 413 the rejection turns
    // into can be written, which is what `should answer an oversized body with a 413` in
    // login.test.ts covers from the other side
    test('pauses the request rather than destroying it when the body is too large', async () => {
      const req = createMockRequest('/login', 'localhost:9999');
      let paused = false;
      let destroyed = false;

      req.on('pause', () => {
        paused = true;
      });

      req.on('close', () => {
        destroyed = true;
      });

      queueMicrotask(() => {
        req.emit('data', Buffer.alloc(64, 0x61));
      });

      await expect(getJsonBody(req, 32)).rejects.toBeInstanceOf(
        PayloadTooLargeError
      );
      expect(paused).toBe(true);
      expect(destroyed).toBe(false);
    });

    test('accepts a body exactly at the maximum', async () => {
      const req = createMockRequest('/login', 'localhost:9999');
      const body = JSON.stringify({ a: 'b' });

      queueMicrotask(() => {
        req.emit('data', Buffer.from(body));
        req.emit('end');
      });

      await expect(getJsonBody(req, Buffer.byteLength(body))).resolves.toEqual({
        a: 'b'
      });
    });

    test('decodes multi-byte characters split across chunks', async () => {
      const req = createMockRequest('/login', 'localhost:9999');
      const body = Buffer.from(JSON.stringify({ name: 'caf\u00e9' }));

      queueMicrotask(() => {
        // split in the middle of the two-byte e-acute
        req.emit('data', body.subarray(0, 12));
        req.emit('data', body.subarray(12));
        req.emit('end');
      });

      await expect(getJsonBody(req)).resolves.toEqual({ name: 'caf\u00e9' });
    });
  });
});
