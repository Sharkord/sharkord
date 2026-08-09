import { describe, expect, test } from 'bun:test';
import { testsBaseUrl } from '../../__tests__/setup';

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

  test('allows any origin with the default config', async () => {
    const response = await fetch(`${testsBaseUrl}/healthz`, {
      headers: { Origin: 'https://somewhere.example' }
    });

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});
