import { sha256 } from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { login } from '../../__tests__/helpers';
import { TEST_SECRET_TOKEN } from '../../__tests__/seed';
import { tdb } from '../../__tests__/setup';
import { users } from '../../db/schema';

describe('/login', () => {
  test('should successfully login with valid credentials', async () => {
    const response = await login('testowner', 'password123');

    expect(response.status).toBe(200);

    const data = (await response.json()) as { success: boolean; token: string };

    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('token');

    const decoded = jwt.verify(data.token, await sha256(TEST_SECRET_TOKEN));

    expect(decoded).toHaveProperty('userId');
  });

  test('should fail login with invalid password', async () => {
    const response = await login('testowner', 'wrongpassword');

    expect(response.status).toBe(400);

    const data: any = await response.json();

    expect(data).toHaveProperty('errors');
    expect(data.errors).toHaveProperty('password', 'Invalid password');
  });

  test('should fail login for banned user', async () => {
    await tdb
      .update(users)
      .set({
        banned: true,
        banReason: 'Test ban reason'
      })
      .where(eq(users.identity, 'testuser'));

    const response = await login('testuser', 'password123');

    expect(response.status).toBe(400);

    const data: any = await response.json();

    expect(data).toHaveProperty('errors');
    expect(data.errors).toHaveProperty('identity');
    expect(data.errors.identity).toContain('banned');
  });

  test('should fail with missing identity', async () => {
    const response = await login('', 'somepassword');

    expect(response.status).toBe(400);

    const data = await response.json();

    expect(data).toHaveProperty('errors');
  });

  test('should fail with missing password', async () => {
    const response = await login('someidentity', '');

    expect(response.status).toBe(400);

    const data = await response.json();

    expect(data).toHaveProperty('errors');
  });

  test('should return valid JWT token with userId claim', async () => {
    const response = await login('testowner', 'password123');

    expect(response.status).toBe(200);

    const data: any = await response.json();

    const decoded = jwt.verify(
      data.token,
      await sha256(TEST_SECRET_TOKEN)
    ) as jwt.JwtPayload;

    expect(decoded).toHaveProperty('userId');
    expect(typeof decoded.userId).toBe('number');
    expect(decoded).toHaveProperty('exp');
    expect(decoded).toHaveProperty('iat');
  });

  test('should rate limit excessive login attempts', async () => {
    for (let i = 0; i < 5; i++) {
      const response = await login('testowner', 'wrongpassword');

      expect(response.status).toBe(400);
    }

    const limitedResponse = await login('testowner', 'wrongpassword');

    expect(limitedResponse.status).toBe(429);
    expect(limitedResponse.headers.get('retry-after')).toBeTruthy();

    const data = await limitedResponse.json();

    expect(data).toHaveProperty(
      'error',
      'Too many login attempts. Please try again shortly.'
    );
  });

  test('should trim identity', async () => {
    const response = await login('  testowner  ', 'password123');

    expect(response.status).toBe(200);

    const data = await response.json();

    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('token');
  });
});
