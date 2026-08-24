import { describe, expect, test } from 'bun:test';
import { testsBaseUrl } from '../../__tests__/setup';
import { SERVER_VERSION } from '../../utils/env';

describe('/healthz', () => {
  test('should return 200 status', async () => {
    const response = await fetch(`${testsBaseUrl}/healthz`);

    expect(response.status).toBe(200);

    const data = await response.json();

    expect(data).toHaveProperty('status', 'ok');
    expect(data).toHaveProperty('timestamp');
  });
});

describe('security and cors headers', () => {
  test('sets nosniff on every response', async () => {
    const response = await fetch(`${testsBaseUrl}/healthz`);

    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  test('sets nosniff on served files too', async () => {
    const response = await fetch(`${testsBaseUrl}/public/does-not-exist.txt`);

    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  // set at the dispatcher rather than per route, so the cases below are the three shapes a
  // response can take: a handler that succeeded, one that answered 404, and one that threw
  test('sets the server version on every response', async () => {
    const response = await fetch(`${testsBaseUrl}/healthz`);

    expect(response.headers.get('X-Sharkord-Version')).toBe(SERVER_VERSION);
  });

  test('sets the server version on a not found response', async () => {
    const response = await fetch(`${testsBaseUrl}/public/does-not-exist.txt`);

    expect(response.status).toBe(404);
    expect(response.headers.get('X-Sharkord-Version')).toBe(SERVER_VERSION);
  });

  test('sets the server version on a failed request', async () => {
    const response = await fetch(`${testsBaseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: '', password: '' })
    });

    expect(response.status).toBe(400);
    expect(response.headers.get('X-Sharkord-Version')).toBe(SERVER_VERSION);
  });

  test('allows any origin with the default config', async () => {
    const response = await fetch(`${testsBaseUrl}/healthz`, {
      headers: { Origin: 'https://somewhere.example' }
    });

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});
