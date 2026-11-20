import {
  DEFAULT_RATE_LIMITERS,
  RateLimiter,
  STORAGE_MIN_MEDIA_PROXY_MAX_SIZE
} from '@sharkord/shared';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  spyOn,
  test
} from 'bun:test';
import { tdb, testsBaseUrl } from '../../__tests__/setup';
import * as serverQueries from '../../db/queries/server';
import { settings } from '../../db/schema';
import { buildMediaProxyUrl } from '../../helpers/media-proxy';
import * as network from '../../helpers/network';
import { setRateLimits } from '../../helpers/rate-limits';

const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]);
const VIDEO_BYTES = new Uint8Array(Array.from({ length: 100 }, (_, i) => i));
// the size tests lower the limit to the smallest one allowed, so they stay small
const SMALL_LIMIT = STORAGE_MIN_MEDIA_PROXY_MAX_SIZE;

// the upstream is a local server, so it sits on loopback. 127.0.0.1 is made to pass the
// public address check, while `localhost` keeps going through the real one and stands in
// for an internal host
let upstream: ReturnType<typeof Bun.serve>;
let upstreamUrl: string;
let internalUrl: string;

beforeAll(() => {
  upstream = Bun.serve({
    port: 0,
    hostname: '127.0.0.1',
    fetch: (req) => {
      const { pathname } = new URL(req.url);

      switch (pathname) {
        case '/cat.png':
          return new Response(PNG_BYTES, {
            headers: { 'Content-Type': 'image/png', 'Set-Cookie': 'a=b' }
          });
        case '/clip.mp4': {
          const range = req.headers.get('range');

          if (!range) {
            return new Response(VIDEO_BYTES, {
              headers: { 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes' }
            });
          }

          return new Response(VIDEO_BYTES.slice(10, 20), {
            status: 206,
            headers: {
              'Content-Type': 'video/mp4',
              'Accept-Ranges': 'bytes',
              'Content-Range': `bytes 10-19/${VIDEO_BYTES.length}`
            }
          });
        }
        case '/huge.mp4':
          return new Response(VIDEO_BYTES.slice(0, 10), {
            status: 206,
            headers: {
              'Content-Type': 'video/mp4',
              'Content-Range': `bytes 0-9/${SMALL_LIMIT + 1}`
            }
          });
        case '/endless.mp4': {
          const chunk = new Uint8Array(64 * 1024);
          let sent = 0;

          // no length up front, so only the byte count while streaming can stop it
          const body = new ReadableStream({
            pull: (controller) => {
              if (sent > SMALL_LIMIT * 2) {
                controller.close();

                return;
              }

              sent += chunk.length;
              controller.enqueue(chunk);
            }
          });

          return new Response(body, {
            headers: { 'Content-Type': 'video/mp4' }
          });
        }
        case '/slow.png':
          return Bun.sleep(1500).then(
            () =>
              new Response(PNG_BYTES, {
                headers: { 'Content-Type': 'image/png' }
              })
          );
        case '/page.html':
          return new Response('<html></html>', {
            headers: { 'Content-Type': 'text/html' }
          });
        case '/icon.svg':
          return new Response('<svg><script>alert(1)</script></svg>', {
            headers: { 'Content-Type': 'image/svg+xml' }
          });
        case '/to-public':
          return Response.redirect(`${upstreamUrl}/cat.png`, 302);
        case '/to-internal':
          return Response.redirect(`${internalUrl}/cat.png`, 302);
        default:
          return new Response('not found', { status: 404 });
      }
    }
  });

  upstreamUrl = `http://127.0.0.1:${upstream.port}`;
  internalUrl = `http://localhost:${upstream.port}`;
});

afterAll(() => {
  upstream.stop(true);
});

beforeEach(() => {
  spyOn(serverQueries, 'getServerTokenSync').mockReturnValue(
    'test-server-token-12345'
  );

  const originalResolve = network.resolvePublicAddress;

  spyOn(network, 'resolvePublicAddress').mockImplementation((hostname) => {
    if (hostname === '127.0.0.1') return Promise.resolve('127.0.0.1');

    return originalResolve(hostname);
  });
});

const requestProxy = (path: string, init?: RequestInit) =>
  fetch(`${testsBaseUrl}${buildMediaProxyUrl(`${upstreamUrl}${path}`)}`, init);

describe('/media-proxy', () => {
  test('should stream an image with the proxy headers and none of the upstream ones', async () => {
    const response = await requestProxy('/cat.png');

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');
    expect(response.headers.get('cache-control')).toBe('public, max-age=86400');
    expect(response.headers.get('content-security-policy')).toBe(
      "default-src 'none'; sandbox"
    );
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(PNG_BYTES);
  });

  test('should pass a range request through as a partial response', async () => {
    const response = await requestProxy('/clip.mp4', {
      headers: { Range: 'bytes=10-19' }
    });

    expect(response.status).toBe(206);
    expect(response.headers.get('content-range')).toBe(
      `bytes 10-19/${VIDEO_BYTES.length}`
    );
    expect(response.headers.get('accept-ranges')).toBe('bytes');
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(
      VIDEO_BYTES.slice(10, 20)
    );
  });

  test('should follow a redirect that stays on a public address', async () => {
    const response = await requestProxy('/to-public');

    expect(response.status).toBe(200);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(PNG_BYTES);
  });

  test('should return 404 when the media proxy is disabled', async () => {
    await tdb.update(settings).set({ storageMediaProxyEnabled: false });

    const response = await requestProxy('/cat.png');

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Not found' });
  });

  test('should return 403 without a signature', async () => {
    const params = new URLSearchParams({ url: `${upstreamUrl}/cat.png` });
    const response = await fetch(`${testsBaseUrl}/media-proxy?${params}`);

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'Forbidden' });
  });

  test('should return 403 when the signature belongs to another url', async () => {
    const signed = new URL(
      buildMediaProxyUrl(`${upstreamUrl}/cat.png`),
      testsBaseUrl
    );

    signed.searchParams.set('url', `${upstreamUrl}/clip.mp4`);

    const response = await fetch(signed);

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'Forbidden' });
  });

  test('should refuse a url on an internal address', async () => {
    const response = await fetch(
      `${testsBaseUrl}${buildMediaProxyUrl(`${internalUrl}/cat.png`)}`
    );

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'Could not load media' });
  });

  test('should refuse a public url that redirects to an internal address', async () => {
    const response = await requestProxy('/to-internal');

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'Could not load media' });
  });

  test('should return 502 when the upstream answers with an error', async () => {
    const response = await requestProxy('/missing.png');

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'Could not load media' });
  });

  test('should refuse a page that is not media', async () => {
    const response = await requestProxy('/page.html');

    expect(response.status).toBe(415);
    expect(await response.json()).toEqual({ error: 'Unsupported media type' });
  });

  test('should refuse svg, which could run script from our origin', async () => {
    const response = await requestProxy('/icon.svg');

    expect(response.status).toBe(415);
    expect(await response.json()).toEqual({ error: 'Unsupported media type' });
  });

  test('should refuse media larger than the proxy limit', async () => {
    await tdb.update(settings).set({ storageMediaProxyMaxSize: SMALL_LIMIT });

    const response = await requestProxy('/huge.mp4');

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: 'Media is too large' });
  });

  test('should cut a stream off once it outgrows the proxy limit', async () => {
    await tdb.update(settings).set({ storageMediaProxyMaxSize: SMALL_LIMIT });

    const response = await requestProxy('/endless.mp4');

    expect(response.status).toBe(200);
    expect(response.headers.get('content-length')).toBeNull();

    let received = 0;

    try {
      for await (const chunk of response.body!) {
        received += chunk.length;
      }
    } catch {
      // the proxy drops the connection, which is the expected end of this stream
    }

    expect(received).toBeLessThanOrEqual(SMALL_LIMIT);
  });

  test('should send the cache lifetime from the settings', async () => {
    await tdb.update(settings).set({ storageMediaProxyCacheSeconds: 600 });

    const response = await requestProxy('/cat.png');

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('public, max-age=600');
  });

  test('should refuse a redirect past the configured limit', async () => {
    await tdb.update(settings).set({ storageMediaProxyMaxRedirects: 0 });

    const response = await requestProxy('/to-public');

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'Could not load media' });
  });

  test('should give up on an upstream slower than the timeout', async () => {
    await tdb.update(settings).set({ storageMediaProxyTimeoutSeconds: 1 });

    const response = await requestProxy('/slow.png');

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'Could not load media' });
  });

  // lowered from the default so the test does not fire a thousand requests. it is also
  // below the global limit, which shows the proxy reads its own override
  test('should rate limit with the media proxy override', async () => {
    const maxRequests = 5;

    setRateLimits({
      ...DEFAULT_RATE_LIMITERS,
      overrides: {
        ...DEFAULT_RATE_LIMITERS.overrides,
        [RateLimiter.MEDIA_PROXY]: { maxRequests, windowMs: 60_000 }
      }
    });

    const statuses: number[] = [];

    for (let i = 0; i < maxRequests + 1; i++) {
      const response = await requestProxy('/cat.png');

      await response.arrayBuffer();
      statuses.push(response.status);
    }

    expect(statuses.slice(0, maxRequests).every((s) => s === 200)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
  });
});
