import { sha256 } from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { register } from '../../__tests__/helpers';
import { TEST_SECRET_TOKEN } from '../../__tests__/seed';
import { tdb } from '../../__tests__/setup';
import { invites, roles, settings, userRoles, users } from '../../db/schema';

describe('/register', () => {
  test('should successfully register new user when allowNewUsers is true', async () => {
    const response = await register('newuser', 'password123', 'New User');

    expect(response.status).toBe(200);

    const data = (await response.json()) as { success: boolean; token: string };

    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('token');

    const decoded = jwt.verify(data.token, await sha256(TEST_SECRET_TOKEN));
    expect(decoded).toHaveProperty('userId');

    const newDbUser = await tdb
      .select()
      .from(users)
      .where(eq(users.identity, 'newuser'))
      .get();
    expect(newDbUser).toBeTruthy();
    expect(newDbUser?.name).toBe('New User');
  });

  test('should fail when allowNewUsers is false and no invite provided', async () => {
    await tdb.update(settings).set({ allowNewUsers: false });

    const response = await register(
      'anothernewuser',
      'password123',
      'New User'
    );

    expect(response.status).toBe(400);

    const data: any = await response.json();

    expect(data).toHaveProperty('errors');
    expect(data.errors).toHaveProperty('identity', 'Invalid invite code');
  });

  test('should allow registration with valid invite when allowNewUsers is false', async () => {
    await tdb.update(settings).set({ allowNewUsers: false });

    await tdb.insert(invites).values({
      code: 'TESTINVITE123',
      creatorId: 1,
      maxUses: 5,
      uses: 0,
      expiresAt: Date.now() + 86400000, // 1 day
      createdAt: Date.now()
    });

    const response = await register(
      'inviteuser',
      'password123',
      'New User',
      'TESTINVITE123'
    );

    expect(response.status).toBe(200);

    const data = await response.json();

    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('token');

    const updatedInvite = await tdb
      .select()
      .from(invites)
      .where(eq(invites.code, 'TESTINVITE123'))
      .get();

    expect(updatedInvite?.uses).toBe(1);
  });

  test('should fail with expired invite', async () => {
    await tdb.update(settings).set({ allowNewUsers: false });

    await tdb.insert(invites).values({
      code: 'EXPIREDINVITE',
      creatorId: 1,
      maxUses: 5,
      uses: 0,
      expiresAt: Date.now() - 1000, // expired
      createdAt: Date.now() - 86400000
    });

    const response = await register(
      'expiredinviteuser',
      'password123',
      'New User',
      'EXPIREDINVITE'
    );

    expect(response.status).toBe(400);

    const data: any = await response.json();

    expect(data).toHaveProperty('errors');
    expect(data.errors).toHaveProperty('identity');
  });

  test('should fail with maxed out invite', async () => {
    await tdb.update(settings).set({ allowNewUsers: false });

    // Create a maxed out invite
    await tdb.insert(invites).values({
      code: 'MAXEDINVITE',
      creatorId: 1,
      maxUses: 2,
      uses: 2,
      expiresAt: Date.now() + 86400000,
      createdAt: Date.now()
    });

    const response = await register(
      'maxedinviteuser',
      'password123',
      'New User',
      'EXPIREDMAXEDINVITEINVITE'
    );

    expect(response.status).toBe(400);

    const data: any = await response.json();

    expect(data).toHaveProperty('errors');
    expect(data.errors).toHaveProperty('identity');
  });

  test('should fail with non-existent invite', async () => {
    await tdb.update(settings).set({ allowNewUsers: false });

    const response = await register(
      'fakeinviteuser',
      'password123',
      'New User',
      'FAKEINVITECODE'
    );

    expect(response.status).toBe(400);

    const data: any = await response.json();

    expect(data).toHaveProperty('errors');
    expect(data.errors).toHaveProperty('identity');
  });

  test('should fail with missing identity', async () => {
    const response = await register('', 'password123', 'New User');

    expect(response.status).toBe(400);

    const data = await response.json();

    expect(data).toHaveProperty('errors');
  });

  test('should fail with missing password', async () => {
    const response = await register('someidentity', '', 'New User');

    expect(response.status).toBe(400);

    const data = await response.json();

    expect(data).toHaveProperty('errors');
  });

  test('should fail with missing display name', async () => {
    const response = await register('someidentity', 'password123', '');

    expect(response.status).toBe(400);

    const data = await response.json();

    expect(data).toHaveProperty('errors');
  });

  test('should return valid JWT token with userId claim', async () => {
    const response = await register('claimidentity', 'password123', 'New User');

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

  test('should assign default role to newly registered user', async () => {
    const response = await register('roleuser', 'password123', 'New User');

    expect(response.status).toBe(200);

    const newUser = await tdb
      .select()
      .from(users)
      .where(eq(users.identity, 'roleuser'))
      .get();

    expect(newUser).toBeTruthy();

    const userRole = await tdb
      .select()
      .from(userRoles)
      .where(eq(userRoles.userId, newUser!.id))
      .get();

    expect(userRole).toBeTruthy();

    const role = await tdb
      .select()
      .from(roles)
      .where(eq(roles.id, userRole!.roleId))
      .get();

    expect(role?.isDefault).toBe(true);
  });

  test('should rate limit excessive registration attempts', async () => {
    for (let i = 0; i < 5; i++) {
      const response = await register(`testowner`, 'password123', 'New User');

      expect(response.status).toBe(400);
    }

    const limitedResponse = await register(
      `ratelimituser`,
      'password123',
      'New User'
    );

    expect(limitedResponse.status).toBe(429);
    expect(limitedResponse.headers.get('retry-after')).toBeTruthy();

    const data = await limitedResponse.json();

    expect(data).toHaveProperty(
      'error',
      'Too many register attempts. Please try again shortly.'
    );
  });

  test('should trim identity', async () => {
    const response = await register(`  trimuser  `, 'password123', 'New User');

    expect(response.status).toBe(200);

    const data = await response.json();

    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('token');
  });
});
