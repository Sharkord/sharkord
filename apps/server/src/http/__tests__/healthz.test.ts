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
