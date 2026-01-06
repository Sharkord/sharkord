import type { TServerInfo } from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import { testsBaseUrl } from '../../__tests__/setup';

describe('/info', () => {
  test('should return server info', async () => {
    const response = await fetch(`${testsBaseUrl}/info`);

    expect(response.status).toBe(200);

    const data = (await response.json()) as TServerInfo;

    expect(data).toHaveProperty('serverId');
    expect(data).toHaveProperty('version');
    expect(data).toHaveProperty('name');
    expect(data).toHaveProperty('description');
    expect(data).toHaveProperty('logo');
    expect(data).toHaveProperty('allowNewUsers');

    expect(data.name).toBe('Test Server');
    expect(data.description).toBe('Test server description');
    expect(data.allowNewUsers).toBe(true);
  });
});
