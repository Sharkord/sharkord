import type { TServerInfo } from '@sharkord/shared';
import { afterEach, describe, expect, test } from 'bun:test';
import { testsBaseUrl } from '../../__tests__/setup';
import { config } from '../../config';

describe('/info', () => {
  test('should return server info', async () => {
    const response = await fetch(`${testsBaseUrl}/info`);

    expect(response.status).toBe(200);

    const data = (await response.json()) as TServerInfo;

    expect(data).toHaveProperty('serverId');
    expect(data).toHaveProperty('name');
    expect(data).toHaveProperty('description');
    expect(data).toHaveProperty('logo');
    expect(data).toHaveProperty('allowNewUsers');

    expect(data.name).toBe('Test Server');
    expect(data.description).toBe('Test server description');
    expect(data.allowNewUsers).toBe(true);
  });

  test('should not publish the server version pre-auth', async () => {
    const response = await fetch(`${testsBaseUrl}/info`);
    const data = (await response.json()) as TServerInfo;

    expect(data.version).toBeUndefined();
  });

  describe('oidc flags', () => {
    afterEach(() => {
      config.oidc.enabled = false;
      config.oidc.disableLocalLogin = false;
    });

    test('should report oidc as off by default', async () => {
      const response = await fetch(`${testsBaseUrl}/info`);
      const data = (await response.json()) as TServerInfo;

      expect(data.oidcEnabled).toBe(false);
      expect(data.oidcDisableLocalLogin).toBe(false);
    });

    test('should report both flags when oidc is on', async () => {
      config.oidc.enabled = true;
      config.oidc.disableLocalLogin = true;

      const response = await fetch(`${testsBaseUrl}/info`);
      const data = (await response.json()) as TServerInfo;

      expect(data.oidcEnabled).toBe(true);
      expect(data.oidcDisableLocalLogin).toBe(true);
    });

    // the client hides the password form on this flag alone, so it must never be true
    // while oidc itself is off or a misconfiguration locks everyone out
    test('should not disable local login while oidc is off', async () => {
      config.oidc.enabled = false;
      config.oidc.disableLocalLogin = true;

      const response = await fetch(`${testsBaseUrl}/info`);
      const data = (await response.json()) as TServerInfo;

      expect(data.oidcDisableLocalLogin).toBe(false);
    });
  });
});
