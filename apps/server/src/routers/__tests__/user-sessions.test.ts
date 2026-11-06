import { ActivityLogType, DisconnectCode } from '@sharkord/shared';
import { beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import {
  createFakeSocket,
  getCaller,
  initTest,
  type TFakeSocket
} from '../../__tests__/helpers';
import { tdb } from '../../__tests__/setup';
import { activityLog } from '../../db/schema';
import * as logins from '../../helpers/logins';
import { drainActivityLogQueue } from '../../queues/activity-log';
import { VoiceRuntime } from '../../runtimes/voice';

const DESKTOP_USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) sharkord-app/0.1.0 Chrome/138.0.0.0 Electron/37.2.0 Safari/537.36';

const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0';

const IP_INFO = {
  ip: '203.0.113.7',
  hostname: '',
  city: 'Porto',
  region: 'Porto',
  country: 'PT',
  loc: '41.1496,-8.6110',
  org: 'AS1111 MEO',
  postal: '4000',
  timezone: 'Europe/Lisbon'
};

// the lookup goes to ipinfo.io, keep the tests off the network
beforeEach(() => {
  spyOn(logins, 'getIpInfo').mockResolvedValue(IP_INFO);
});

const connectSession = async (
  userId: number,
  userAgent: string,
  clientVersion?: string
) => {
  const socket = createFakeSocket();
  const { caller } = await getCaller(userId, {
    socket,
    remoteAddress: '203.0.113.7',
    headers: { 'user-agent': userAgent }
  });
  const { handshakeHash } = await caller.others.handshake();

  await caller.others.joinServer({ handshakeHash, clientVersion });

  return { socket, caller };
};

const socketsOf = (targetUserId: number, sockets: TFakeSocket[]) => ({
  getUserWs: (userId: number) => (userId === targetUserId ? sockets : [])
});

describe('user sessions', () => {
  test('should describe every connected session of a user', async () => {
    const { socket: desktop } = await connectSession(
      2,
      DESKTOP_USER_AGENT,
      '1.2.3'
    );
    const { socket: browser } = await connectSession(2, BROWSER_USER_AGENT);

    const { caller } = await initTest(
      1,
      undefined,
      socketsOf(2, [desktop, browser])
    );

    const sessions = await caller.users.getSessions({ userId: 2 });

    expect(sessions).toHaveLength(2);

    const [desktopSession, browserSession] = sessions;

    expect(desktopSession!.id).not.toBe(browserSession!.id);
    expect(desktopSession!.connectedAt).toBeLessThanOrEqual(Date.now());
    expect(desktopSession!.ip).toBe('203.0.113.7');
    expect(desktopSession!.os).toBe('Linux');
    expect(desktopSession!.browser).toStartWith('Electron');
    expect(desktopSession!.desktopVersion).toBe('0.1.0');
    expect(desktopSession!.clientVersion).toBe('1.2.3');
    expect(desktopSession!.userAgent).toBe(DESKTOP_USER_AGENT);

    expect(browserSession!.browser).toBe('Firefox 140.0');
    expect(browserSession!.os).toBe('Windows 10');
    expect(browserSession!.desktopVersion).toBeNull();
    expect(browserSession!.clientVersion).toBeNull();
  });

  test('should resolve the location of a session from its ip', async () => {
    const { socket } = await connectSession(2, BROWSER_USER_AGENT);

    const { caller } = await initTest(1, undefined, socketsOf(2, [socket]));

    const sessions = await caller.users.getSessions({ userId: 2 });

    expect(sessions[0]!.location).toEqual({
      city: 'Porto',
      region: 'Porto',
      country: 'PT',
      org: 'AS1111 MEO',
      timezone: 'Europe/Lisbon'
    });
  });

  test('should keep a session when its location lookup fails', async () => {
    spyOn(logins, 'getIpInfo').mockRejectedValue(new Error('offline'));

    const { socket } = await connectSession(2, BROWSER_USER_AGENT);

    const { caller } = await initTest(1, undefined, socketsOf(2, [socket]));

    const sessions = await caller.users.getSessions({ userId: 2 });

    expect(sessions).toHaveLength(1);
    expect(sessions[0]!.location).toBeNull();
  });

  test('should return no sessions for a user that is not connected', async () => {
    const { caller } = await initTest();

    const sessions = await caller.users.getSessions({ userId: 2 });

    expect(sessions).toEqual([]);
  });

  test('should hide session ips without VIEW_USER_SENSITIVE_DATA', async () => {
    const { socket } = await connectSession(2, BROWSER_USER_AGENT);

    // user 5 is the seeded moderator: MANAGE_USERS without sensitive data access
    const { caller } = await initTest(5, undefined, socketsOf(2, [socket]));

    const sessions = await caller.users.getSessions({ userId: 2 });

    expect(sessions).toHaveLength(1);
    expect(sessions[0]!.ip).toBeNull();
    expect(sessions[0]!.location).toBeNull();
    expect(sessions[0]!.browser).toBe('Firefox 140.0');
  });

  test('should throw when user lacks permissions (getSessions)', async () => {
    const { caller } = await initTest(2);

    await expect(caller.users.getSessions({ userId: 1 })).rejects.toThrow(
      'Insufficient permissions'
    );
  });

  test('should throw when the user does not exist (getSessions)', async () => {
    const { caller } = await initTest();

    await expect(caller.users.getSessions({ userId: 999 })).rejects.toThrow(
      'User not found'
    );
  });

  test('should mark a session active when it makes a call', async () => {
    const { socket, caller: sessionCaller } = await connectSession(
      2,
      BROWSER_USER_AGENT
    );

    socket.session!.lastActiveAt = 0;

    await sessionCaller.threads.getFollowed({});

    expect(socket.session!.lastActiveAt).toBeGreaterThan(0);
  });

  test('should list other online accounts on the same ip', async () => {
    const { socket } = await connectSession(2, BROWSER_USER_AGENT);

    await connectSession(3, DESKTOP_USER_AGENT);

    const { caller } = await initTest(1, undefined, socketsOf(2, [socket]));

    const sessions = await caller.users.getSessions({ userId: 2 });

    expect(sessions[0]!.sharedIpUserIds).toEqual([3]);
  });

  test('should hide accounts sharing an ip without VIEW_USER_SENSITIVE_DATA', async () => {
    const { socket } = await connectSession(2, BROWSER_USER_AGENT);

    await connectSession(3, DESKTOP_USER_AGENT);

    const { caller } = await initTest(5, undefined, socketsOf(2, [socket]));

    const sessions = await caller.users.getSessions({ userId: 2 });

    expect(sessions[0]!.sharedIpUserIds).toEqual([]);
  });

  test('should show which session is in voice', async () => {
    const runtime = new VoiceRuntime(2);

    await runtime.init();

    try {
      const { socket: inVoice, caller: voiceCaller } = await connectSession(
        2,
        DESKTOP_USER_AGENT
      );
      const { socket: idle } = await connectSession(2, BROWSER_USER_AGENT);

      await voiceCaller.voice.join({
        channelId: 2,
        state: { micMuted: false, soundMuted: false }
      });

      const { caller } = await initTest(
        1,
        undefined,
        socketsOf(2, [inVoice, idle])
      );

      const sessions = await caller.users.getSessions({ userId: 2 });

      expect(sessions.map(({ voiceChannelId }) => voiceChannelId)).toEqual([
        2,
        null
      ]);

      // left without the leave route, as on a moderator kick from voice
      runtime.removeUser(2);

      const afterLeave = await caller.users.getSessions({ userId: 2 });

      expect(afterLeave[0]!.voiceChannelId).toBeNull();
    } finally {
      await runtime.destroy();
    }
  });

  test('should count the open sessions of every user', async () => {
    await connectSession(2, BROWSER_USER_AGENT);
    await connectSession(2, DESKTOP_USER_AGENT);
    await connectSession(3, BROWSER_USER_AGENT);

    const { caller } = await initTest();

    const users = await caller.users.getAll();
    const counts = Object.fromEntries(
      users.map(({ id, sessionCount }) => [id, sessionCount])
    );

    expect(counts[2]).toBe(2);
    expect(counts[3]).toBe(1);
    expect(counts[4]).toBe(0);
  });

  test('should reject a client version that is too long', async () => {
    const { caller } = await getCaller(2);
    const { handshakeHash } = await caller.others.handshake();

    await expect(
      caller.others.joinServer({ handshakeHash, clientVersion: 'x'.repeat(33) })
    ).rejects.toThrow();
  });
});

describe('disconnect session', () => {
  test('should close only the chosen session', async () => {
    const { socket: first } = await connectSession(2, BROWSER_USER_AGENT);
    const { socket: second } = await connectSession(2, DESKTOP_USER_AGENT);
    const sessionId = first.session!.id;

    const { caller } = await initTest(
      1,
      undefined,
      socketsOf(2, [first, second])
    );

    await caller.users.disconnectSession({
      userId: 2,
      sessionId,
      reason: 'Stale tab'
    });

    expect(first.closes).toEqual([
      { code: DisconnectCode.KICKED, reason: 'Stale tab' }
    ]);
    expect(second.closes).toEqual([]);

    const sessions = await caller.users.getSessions({ userId: 2 });

    expect(sessions.map(({ id }) => id)).toEqual([second.session!.id]);
  });

  test('should log the disconnect in the activity log', async () => {
    const { socket } = await connectSession(2, BROWSER_USER_AGENT);
    const sessionId = socket.session!.id;

    const { caller } = await initTest(1, undefined, socketsOf(2, [socket]));

    await caller.users.disconnectSession({
      userId: 2,
      sessionId,
      reason: 'Stale tab'
    });

    await drainActivityLogQueue();

    const entry = await tdb
      .select({ userId: activityLog.userId, details: activityLog.details })
      .from(activityLog)
      .where(eq(activityLog.type, ActivityLogType.USER_KICKED))
      .get();

    expect(entry?.userId).toBe(2);
    expect(entry?.details).toEqual({
      reason: 'Stale tab',
      kickedBy: 1,
      sessionId
    });
  });

  test('should throw when user lacks permissions', async () => {
    const { socket } = await connectSession(1, BROWSER_USER_AGENT);

    const { caller } = await initTest(2, undefined, socketsOf(1, [socket]));

    await expect(
      caller.users.disconnectSession({
        userId: 1,
        sessionId: socket.session!.id
      })
    ).rejects.toThrow('Insufficient permissions');

    expect(socket.closes).toEqual([]);
  });

  test('should throw when the session does not exist', async () => {
    const { socket } = await connectSession(2, BROWSER_USER_AGENT);

    const { caller } = await initTest(1, undefined, socketsOf(2, [socket]));

    await expect(
      caller.users.disconnectSession({ userId: 2, sessionId: 'nope' })
    ).rejects.toThrow('Session not found');

    expect(socket.closes).toEqual([]);
  });

  test('should throw when the session belongs to another user', async () => {
    const { socket } = await connectSession(3, BROWSER_USER_AGENT);

    const { caller } = await initTest(1, undefined, socketsOf(3, [socket]));

    await expect(
      caller.users.disconnectSession({
        userId: 2,
        sessionId: socket.session!.id
      })
    ).rejects.toThrow('Session not found');

    expect(socket.closes).toEqual([]);
  });

  test('should not let a moderator disconnect the owner', async () => {
    const { socket } = await connectSession(1, BROWSER_USER_AGENT);

    const { caller } = await initTest(5, undefined, socketsOf(1, [socket]));

    await expect(
      caller.users.disconnectSession({
        userId: 1,
        sessionId: socket.session!.id
      })
    ).rejects.toThrow('Only users with the owner role can act on the server');

    expect(socket.closes).toEqual([]);
  });

  test('should reject a reason that is too long', async () => {
    const { socket } = await connectSession(2, BROWSER_USER_AGENT);

    const { caller } = await initTest(1, undefined, socketsOf(2, [socket]));

    await expect(
      caller.users.disconnectSession({
        userId: 2,
        sessionId: socket.session!.id,
        reason: 'x'.repeat(257)
      })
    ).rejects.toThrow();

    expect(socket.closes).toEqual([]);
  });
});
