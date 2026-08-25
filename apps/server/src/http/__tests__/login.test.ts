import { ChannelType, sha256 } from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import { and, eq, inArray } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { login } from '../../__tests__/helpers';
import { TEST_SECRET_TOKEN } from '../../__tests__/seed';
import { tdb } from '../../__tests__/setup';
import { config } from '../../config';
import { getChannelsReadStatesForUser } from '../../db/queries/channels';
import {
  channelReadStates,
  channels,
  invites,
  messages,
  roles,
  settings,
  userRoles,
  users
} from '../../db/schema';

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

  test('should fail login with invalid password using a generic error to prevent enumeration', async () => {
    const response = await login('testowner', 'wrongpassword');

    expect(response.status).toBe(400);

    const data: any = await response.json();

    expect(data).toHaveProperty('errors');
    expect(data.errors).toHaveProperty('identity', 'Invalid credentials');
    expect(data.errors).not.toHaveProperty('password');
  });

  test('should return the same generic error for an unknown identity when registration is closed', async () => {
    await tdb.update(settings).set({ allowNewUsers: false });

    const response = await login('definitelynotaregistereduser', 'whatever');

    expect(response.status).toBe(400);

    const data: any = await response.json();

    expect(data).toHaveProperty('errors');
    expect(data.errors).toHaveProperty('identity', 'Invalid credentials');
  });

  test('should auto-register new user when allowNewUsers is true', async () => {
    const response = await login('newuser', 'newpassword123');

    expect(response.status).toBe(200);

    const data = await response.json();

    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('token');

    const newUser = await tdb
      .select()
      .from(users)
      .where(eq(users.identity, 'newuser'))
      .get();

    expect(newUser).toBeTruthy();
    expect(newUser?.name).toStartWith('SharkordUser');
  });

  test('should mark all existing messages as read for first-time users', async () => {
    const response = await login('readstateuser', 'password123');

    expect(response.status).toBe(200);

    const newUser = await tdb
      .select()
      .from(users)
      .where(eq(users.identity, 'readstateuser'))
      .get();

    expect(newUser).toBeTruthy();

    const readStates = await tdb
      .select()
      .from(channelReadStates)
      .where(eq(channelReadStates.userId, newUser!.id));

    expect(readStates.length).toBeGreaterThan(0);

    const unreadMap = await getChannelsReadStatesForUser(newUser!.id);

    for (const unreadCount of Object.values(unreadMap)) {
      expect(unreadCount).toBe(0);
    }
  });

  test('should only count new messages as unread after first-time login', async () => {
    const response = await login('readstateuser2', 'password123');

    expect(response.status).toBe(200);

    const newUser = await tdb
      .select()
      .from(users)
      .where(eq(users.identity, 'readstateuser2'))
      .get();

    expect(newUser).toBeTruthy();

    await tdb.insert(messages).values({
      userId: 1,
      channelId: 1,
      content: 'A new message after first join',
      metadata: null,
      createdAt: Date.now()
    });

    const unreadMap = await getChannelsReadStatesForUser(newUser!.id);

    expect(unreadMap[1]).toBe(1);
  });

  test('should not treat a thread reply as the latest message in the backfill', async () => {
    const [parent] = await tdb
      .insert(messages)
      .values({
        userId: 1,
        channelId: 1,
        content: 'top level',
        metadata: null,
        createdAt: Date.now()
      })
      .returning();

    // a reply lives in the same channel but must not move the channel's read marker,
    // or the new user would start with the thread's parent already marked unread
    await tdb.insert(messages).values({
      userId: 1,
      channelId: 1,
      content: 'thread reply',
      parentMessageId: parent!.id,
      metadata: null,
      createdAt: Date.now() + 1
    });

    const response = await login('threadbackfilluser', 'password123');

    expect(response.status).toBe(200);

    const newUser = await tdb
      .select()
      .from(users)
      .where(eq(users.identity, 'threadbackfilluser'))
      .get();

    const readState = await tdb
      .select()
      .from(channelReadStates)
      .where(
        and(
          eq(channelReadStates.userId, newUser!.id),
          eq(channelReadStates.channelId, 1)
        )
      )
      .get();

    expect(readState?.lastReadMessageId).toBe(parent!.id);

    const unreadMap = await getChannelsReadStatesForUser(newUser!.id);

    expect(unreadMap[1]).toBe(0);
  });

  test('should not write a read state for a channel with no messages', async () => {
    const [emptyChannel] = await tdb
      .insert(channels)
      .values({
        name: 'empty-for-backfill',
        type: ChannelType.TEXT,
        position: 99,
        createdAt: Date.now()
      })
      .returning();

    const response = await login('emptychanneluser', 'password123');

    expect(response.status).toBe(200);

    const newUser = await tdb
      .select()
      .from(users)
      .where(eq(users.identity, 'emptychanneluser'))
      .get();

    const readState = await tdb
      .select()
      .from(channelReadStates)
      .where(
        and(
          eq(channelReadStates.userId, newUser!.id),
          eq(channelReadStates.channelId, emptyChannel!.id)
        )
      )
      .get();

    expect(readState).toBeUndefined();
  });

  test('should fail when allowNewUsers is false and no invite provided', async () => {
    await tdb.update(settings).set({ allowNewUsers: false });

    const response = await login('anothernewuser', 'password123');

    expect(response.status).toBe(400);

    const data: any = await response.json();

    expect(data).toHaveProperty('errors');
    expect(data.errors).toHaveProperty('identity', 'Invalid credentials');
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

    const response = await login('inviteuser', 'password123', 'TESTINVITE123');

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

  test('should not let concurrent registrations exceed maxUses', async () => {
    await tdb.update(settings).set({ allowNewUsers: false });

    await tdb.insert(invites).values({
      code: 'RACEINVITE',
      creatorId: 1,
      maxUses: 1,
      uses: 0,
      expiresAt: Date.now() + 86400000,
      createdAt: Date.now()
    });

    const responses = await Promise.all([
      login('raceuser1', 'password123', 'RACEINVITE'),
      login('raceuser2', 'password123', 'RACEINVITE')
    ]);

    const statuses = responses.map((response) => response.status).sort();

    expect(statuses).toEqual([200, 400]);

    const updatedInvite = await tdb
      .select()
      .from(invites)
      .where(eq(invites.code, 'RACEINVITE'))
      .get();

    expect(updatedInvite?.uses).toBe(1);

    const registered = await tdb
      .select()
      .from(users)
      .where(inArray(users.identity, ['raceuser1', 'raceuser2']));

    expect(registered.length).toBe(1);
  });

  test('should not consume an invite use when registration fails', async () => {
    await tdb.update(settings).set({ allowNewUsers: false });

    await tdb.insert(invites).values({
      code: 'ROLLBACKINVITE',
      creatorId: 1,
      maxUses: 5,
      uses: 0,
      expiresAt: Date.now() + 86400000,
      createdAt: Date.now()
    });

    // both requests pass the "identity does not exist" check, so the second
    // one fails on the unique identity index inside the transaction
    const responses = await Promise.all([
      login('sameidentity', 'password123', 'ROLLBACKINVITE'),
      login('sameidentity', 'password123', 'ROLLBACKINVITE')
    ]);

    const okCount = responses.filter((r) => r.status === 200).length;

    expect(okCount).toBeGreaterThanOrEqual(1);

    const updatedInvite = await tdb
      .select()
      .from(invites)
      .where(eq(invites.code, 'ROLLBACKINVITE'))
      .get();

    const registered = await tdb
      .select()
      .from(users)
      .where(eq(users.identity, 'sameidentity'));

    // one use per user actually created, a rolled back registration leaves none
    expect(updatedInvite?.uses).toBe(registered.length);
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

    const response = await login(
      'expiredinviteuser',
      'password123',
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

    const response = await login(
      'maxedinviteuser',
      'password123',
      'MAXEDINVITE'
    );

    expect(response.status).toBe(400);

    const data: any = await response.json();

    expect(data).toHaveProperty('errors');
    expect(data.errors).toHaveProperty('identity');
  });

  test('should fail with non-existent invite', async () => {
    await tdb.update(settings).set({ allowNewUsers: false });

    const response = await login(
      'fakeinviteuser',
      'password123',
      'FAKEINVITECODE'
    );

    expect(response.status).toBe(400);

    const data: any = await response.json();

    expect(data).toHaveProperty('errors');
    expect(data.errors).toHaveProperty('identity');
  });

  test('should expose ban reason to a banned user that authenticates with the right password', async () => {
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
    expect(data.errors.identity).toContain('Test ban reason');
  });

  test('should hide ban status from a banned user that supplies the wrong password', async () => {
    await tdb
      .update(users)
      .set({
        banned: true,
        banReason: 'Test ban reason'
      })
      .where(eq(users.identity, 'testuser'));

    const response = await login('testuser', 'wrongpassword');

    expect(response.status).toBe(400);

    const data: any = await response.json();

    expect(data).toHaveProperty('errors');
    expect(data.errors).toHaveProperty('identity', 'Invalid credentials');
    expect(data.errors.identity).not.toContain('banned');
    expect(data.errors.identity).not.toContain('Test ban reason');
  });

  test('should rate limit /login on its own limiter', async () => {
    // this used to borrow config.rateLimiters.joinServer, so tuning the join limit silently
    // retuned brute-force protection on the password endpoint
    const attempts = config.rateLimiters.login.maxRequests;

    for (let i = 0; i < attempts; i++) {
      await login('testowner', 'wrongpassword');
    }

    const limited = await login('testowner', 'password123');

    expect(limited.status).toBe(429);
  });

  test('should not let a spoofed forwarded header reset the /login limiter', async () => {
    // /login stays keyed on the socket address because there is no authenticated user yet,
    // so this is the endpoint where the trusted-proxy gate actually protects against
    // unlimited password guessing.
    //
    // the tests reach the server over loopback, which the default trustedProxies now
    // trusts, so the untrusted socket this asserts about has to be set up explicitly
    const originalTrustedProxies = [...config.server.trustedProxies];

    config.server.trustedProxies = [];

    try {
      const attempts = config.rateLimiters.login.maxRequests;

      for (let i = 0; i < attempts; i++) {
        await login('testowner', 'wrongpassword', undefined, {
          'x-forwarded-for': `1.2.3.${i}`,
          'x-real-ip': `4.5.6.${i}`
        });
      }

      const limited = await login('testowner', 'password123', undefined, {
        'x-forwarded-for': '9.9.9.9',
        'cf-connecting-ip': '8.8.8.8'
      });

      expect(limited.status).toBe(429);
    } finally {
      config.server.trustedProxies = originalTrustedProxies;
    }
  });

  // the flip side of the test above, and the reason the default is what it is: a proxy on
  // the same host is trusted, so its forwarded chain is what the limiter keys on
  test('should key the /login limiter per client behind a trusted loopback proxy', async () => {
    const attempts = config.rateLimiters.login.maxRequests;

    for (let i = 0; i < attempts; i++) {
      await login('testowner', 'wrongpassword', undefined, {
        'x-forwarded-for': `5.5.5.${i}`
      });
    }

    const differentClient = await login(
      'testowner',
      'wrongpassword',
      undefined,
      {
        'x-forwarded-for': '6.6.6.6'
      }
    );

    expect(differentClient.status).not.toBe(429);
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

  test('should assign default role to newly registered user', async () => {
    const response = await login('roleuser', 'password123');

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

  test('identity should be case-insensitive', async () => {
    const response = await login('TESTOWNER', 'password123');

    expect(response.status).toBe(200);

    const data = (await response.json()) as { token: string };

    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('token');

    const decoded = jwt.verify(
      data.token,
      await sha256(TEST_SECRET_TOKEN)
    ) as jwt.JwtPayload;

    expect(decoded).toHaveProperty('userId');

    const firstUser = await tdb
      .select()
      .from(users)
      .where(eq(users.id, decoded.userId))
      .get();

    const response2 = await login('testowner', 'password123');

    expect(response2.status).toBe(200);

    const data2 = (await response2.json()) as { token: string };

    const decoded2 = jwt.verify(
      data2.token,
      await sha256(TEST_SECRET_TOKEN)
    ) as jwt.JwtPayload;

    expect(decoded2).toHaveProperty('userId');
    expect(decoded2.userId).toBe(firstUser?.id);
  });
});
