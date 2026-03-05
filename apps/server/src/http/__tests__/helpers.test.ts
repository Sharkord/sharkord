import { describe, expect, test } from 'bun:test';
import { EventEmitter } from 'events';
import type http from 'http';
import {
  getJsonBody,
  getRequestPathname,
  hasPrefixPathSegment
} from '../helpers';

const createMockRequest = (
  url?: string,
  host?: string
): EventEmitter & http.IncomingMessage => {
  const req = new EventEmitter() as EventEmitter & http.IncomingMessage;

  req.url = url;
  req.headers = { host };

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

  describe('getRequestPathname', () => {
    test('returns pathname and ignores query params', () => {
      const req = createMockRequest(
        '/plugin-bundle/plugin-a/index.js?v=123',
        'localhost:9999'
      );

      expect(getRequestPathname(req)).toBe('/plugin-bundle/plugin-a/index.js');
    });

    test('returns null when url is missing', () => {
      const req = createMockRequest(undefined, 'localhost:9999');

      expect(getRequestPathname(req)).toBeNull();
    });

    test('returns null for invalid absolute url', () => {
      const req = createMockRequest('http://[', 'localhost:9999');

      expect(getRequestPathname(req)).toBeNull();
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
  });
});
