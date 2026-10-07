import {
  ChannelPermission,
  Permission,
  REACTION_EMOJI_MAX_LENGTH,
  ServerEvents,
  StreamKind
} from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import { and, eq } from 'drizzle-orm';
import { initTest } from '../../__tests__/helpers';
import { tdb } from '../../__tests__/setup';
import { config } from '../../config';
import {
  channelRolePermissions,
  rolePermissions,
  roles
} from '../../db/schema';
import { VoiceRuntime } from '../../runtimes/voice';
import { pubsub } from '../../utils/pubsub';

type TVoiceCaller = Awaited<ReturnType<typeof initTest>>['caller'];

// seeded private voice channel, nobody has channel permissions on it
const PRIVATE_VOICE_CHANNEL_ID = 4;

// seeded dm channel between user 3 and user 4
const DM_CHANNEL_ID = 3;

const VOICE_CHANNEL_ID = 2;

const joinVoiceChannelTwo = async (userId: number) => {
  const runtime = new VoiceRuntime(VOICE_CHANNEL_ID);

  runtime.addUser(userId, { micMuted: false, soundMuted: false });

  const { caller } = await initTest(userId, undefined, {
    currentVoiceChannelId: VOICE_CHANNEL_ID
  });

  return { runtime, caller };
};

const createDirectScreenShareRuntime = (
  userIds: number[],
  supportedUserIds: number[] = userIds,
  channelId: number = VOICE_CHANNEL_ID
) => {
  const runtime = new VoiceRuntime(channelId);

  userIds.forEach((userId) => {
    runtime.addUser(userId, {
      micMuted: false,
      soundMuted: false,
      supportsDirectScreenShare: supportedUserIds.includes(userId)
    });
  });

  return runtime;
};

const initVoiceCaller = (
  userId: number,
  channelId: number = VOICE_CHANNEL_ID
) => initTest(userId, undefined, { currentVoiceChannelId: channelId });

const revokeFromDefaultRole = async (permission: Permission) =>
  tdb
    .delete(rolePermissions)
    .where(
      and(
        eq(rolePermissions.roleId, 2),
        eq(rolePermissions.permission, permission)
      )
    );

const grantPrivateChannelViewToDefaultRole = async (channelId: number) => {
  const defaultRole = await tdb
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.isDefault, true))
    .get();

  await tdb.insert(channelRolePermissions).values({
    channelId,
    roleId: defaultRole!.id,
    permission: ChannelPermission.VIEW_CHANNEL,
    allow: true,
    createdAt: Date.now()
  });
};

describe('voice router', () => {
  test('should rate limit excessive voice join attempts', async () => {
    const { caller } = await initTest(1);

    for (let i = 0; i < 20; i++) {
      await expect(
        caller.voice.join({
          channelId: 999999,
          state: {
            micMuted: false,
            soundMuted: false
          }
        })
      ).rejects.toThrow('Insufficient channel permissions');
    }

    await expect(
      caller.voice.join({
        channelId: 999999,
        state: {
          micMuted: false,
          soundMuted: false
        }
      })
    ).rejects.toThrow('Too many requests. Please try again shortly.');
  });

  describe('moveUser', () => {
    test('should reject when the caller lacks MOVE_MEMBERS', async () => {
      const { caller } = await initTest(2);

      await expect(
        caller.voice.moveUser({ userId: 4, channelId: 2 })
      ).rejects.toThrow('Insufficient permissions');
    });

    test('should reject when the target channel does not exist', async () => {
      const { caller } = await initTest(1);

      await expect(
        caller.voice.moveUser({ userId: 4, channelId: 999999 })
      ).rejects.toThrow('Channel not found');
    });

    test('should reject when the target channel is not a voice channel', async () => {
      const { caller } = await initTest(1);

      await expect(
        caller.voice.moveUser({ userId: 4, channelId: 1 })
      ).rejects.toThrow('Channel is not a voice channel');
    });

    test('should reject when the caller cannot join the destination channel', async () => {
      const { caller } = await initTest(2);

      const defaultRole = await tdb
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.isDefault, true))
        .get();

      await tdb
        .insert(rolePermissions)
        .values({
          roleId: defaultRole!.id,
          permission: Permission.MOVE_MEMBERS,
          createdAt: Date.now()
        })
        .execute();

      await expect(
        caller.voice.moveUser({
          userId: 4,
          channelId: PRIVATE_VOICE_CHANNEL_ID
        })
      ).rejects.toThrow('Insufficient channel permissions');
    });

    test('should reject when the caller can join but not view the private destination', async () => {
      const { caller } = await initTest(2);

      const defaultRole = await tdb
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.isDefault, true))
        .get();

      await tdb
        .insert(rolePermissions)
        .values({
          roleId: defaultRole!.id,
          permission: Permission.MOVE_MEMBERS,
          createdAt: Date.now()
        })
        .execute();

      await tdb
        .insert(channelRolePermissions)
        .values({
          channelId: PRIVATE_VOICE_CHANNEL_ID,
          roleId: defaultRole!.id,
          permission: ChannelPermission.JOIN,
          allow: true,
          createdAt: Date.now()
        })
        .execute();

      await expect(
        caller.voice.moveUser({
          userId: 4,
          channelId: PRIVATE_VOICE_CHANNEL_ID
        })
      ).rejects.toThrow('Insufficient channel permissions');
    });

    test('should allow moving a user into a channel they cannot access themselves', async () => {
      const { caller } = await initTest(1);

      const originRuntime = new VoiceRuntime(2);

      originRuntime.addUser(4, { micMuted: false, soundMuted: false });

      try {
        await expect(
          caller.voice.moveUser({
            userId: 4,
            channelId: PRIVATE_VOICE_CHANNEL_ID
          })
        ).resolves.toBeUndefined();
      } finally {
        await originRuntime.destroy();
      }
    });

    test('should let the moved user join the destination through the one-time grant', async () => {
      const { caller: ownerCaller } = await initTest(1);
      const { caller: movedCaller } = await initTest(4);

      const originRuntime = new VoiceRuntime(2);
      const destinationRuntime = new VoiceRuntime(PRIVATE_VOICE_CHANNEL_ID);

      await destinationRuntime.init();

      originRuntime.addUser(4, { micMuted: false, soundMuted: false });

      const joinInput = {
        channelId: PRIVATE_VOICE_CHANNEL_ID,
        state: { micMuted: false, soundMuted: false }
      };

      try {
        await expect(movedCaller.voice.join(joinInput)).rejects.toThrow(
          'Insufficient channel permissions'
        );

        await ownerCaller.voice.moveUser({
          userId: 4,
          channelId: PRIVATE_VOICE_CHANNEL_ID
        });

        originRuntime.removeUser(4);

        const result = await movedCaller.voice.join(joinInput);

        expect(result.routerRtpCapabilities).toBeDefined();

        destinationRuntime.removeUser(4);

        await expect(movedCaller.voice.join(joinInput)).rejects.toThrow(
          'Insufficient channel permissions'
        );
      } finally {
        await originRuntime.destroy();
        await destinationRuntime.destroy();
      }
    });

    test('should keep the grant when the join is refused after it is checked', async () => {
      const { caller: ownerCaller } = await initTest(1);
      const { caller: movedCaller } = await initTest(4);

      const originRuntime = new VoiceRuntime(2);
      const destinationRuntime = new VoiceRuntime(PRIVATE_VOICE_CHANNEL_ID);

      await destinationRuntime.init();

      originRuntime.addUser(4, { micMuted: false, soundMuted: false });

      const joinInput = {
        channelId: PRIVATE_VOICE_CHANNEL_ID,
        state: { micMuted: false, soundMuted: false }
      };

      try {
        await ownerCaller.voice.moveUser({
          userId: 4,
          channelId: PRIVATE_VOICE_CHANNEL_ID
        });

        // joining before leaving the origin call is refused, and must not spend the grant:
        // the move the user was sent on is the retry that follows
        await expect(movedCaller.voice.join(joinInput)).rejects.toThrow(
          'User already in a voice channel'
        );

        originRuntime.removeUser(4);

        const result = await movedCaller.voice.join(joinInput);

        expect(result.routerRtpCapabilities).toBeDefined();
      } finally {
        await originRuntime.destroy();
        await destinationRuntime.destroy();
      }
    });

    test('should refuse a dm call as the destination', async () => {
      // dm channels are created with the voice type, so the type check alone lets one
      // through. join refuses it later, but only after the move has already revealed a
      // conversation between two other people to the user being moved
      const defaultRole = await tdb
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.isDefault, true))
        .get();

      await tdb.insert(rolePermissions).values({
        roleId: defaultRole!.id,
        permission: Permission.MOVE_MEMBERS,
        createdAt: Date.now()
      });

      // user 3 is a participant in the seeded dm, so every other gate on the route passes
      const { caller } = await initTest(3);

      await expect(
        caller.voice.moveUser({ userId: 4, channelId: DM_CHANNEL_ID })
      ).rejects.toThrow('Cannot move a user into a direct message call');
    });

    test('should reject when the target user lacks the global voice permission', async () => {
      const { caller } = await initTest(1);

      const defaultRole = await tdb
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.isDefault, true))
        .get();

      await tdb
        .delete(rolePermissions)
        .where(
          and(
            eq(rolePermissions.roleId, defaultRole!.id),
            eq(rolePermissions.permission, Permission.JOIN_VOICE_CHANNELS)
          )
        )
        .execute();

      await expect(
        caller.voice.moveUser({ userId: 4, channelId: 2 })
      ).rejects.toThrow('Target user is not allowed to use voice channels');
    });

    test('should reject when the target user is not in a voice channel', async () => {
      const { caller } = await initTest(1);

      await expect(
        caller.voice.moveUser({ userId: 4, channelId: 2 })
      ).rejects.toThrow('User is not in a voice channel');
    });

    test('should reject when the target user is in a dm call', async () => {
      const { caller } = await initTest(1);

      const dmRuntime = new VoiceRuntime(DM_CHANNEL_ID);

      dmRuntime.addUser(4, { micMuted: false, soundMuted: false });

      try {
        await expect(
          caller.voice.moveUser({ userId: 4, channelId: 2 })
        ).rejects.toThrow('User is not in a voice channel');
      } finally {
        await dmRuntime.destroy();
      }
    });

    // the channel has to reach the moved user's client for anything to render for it at all:
    // getChannelsForUser filters it out, so this push is the only thing that puts it there.
    // the panel it ends up showing them is M80, which no harness can reach without mediasoup
    test('should reveal the destination to the user it moves in', async () => {
      const { caller } = await initTest(1);

      const originRuntime = new VoiceRuntime(2);

      originRuntime.addUser(4, { micMuted: false, soundMuted: false });

      const revealed: number[] = [];

      const subscription = pubsub
        .subscribeFor(4, ServerEvents.CHANNEL_CREATE)
        .subscribe({
          next: (channel) => {
            revealed.push(channel.id);
          }
        });

      try {
        await caller.voice.moveUser({
          userId: 4,
          channelId: PRIVATE_VOICE_CHANNEL_ID
        });

        expect(revealed).toEqual([PRIVATE_VOICE_CHANNEL_ID]);
      } finally {
        subscription.unsubscribe();
        await originRuntime.destroy();
      }
    });

    test('should take the revealed channel back when the moved user leaves', async () => {
      const runtime = new VoiceRuntime(PRIVATE_VOICE_CHANNEL_ID);

      runtime.addUser(4, { micMuted: false, soundMuted: false });

      const { caller } = await initTest(4, undefined, {
        currentVoiceChannelId: PRIVATE_VOICE_CHANNEL_ID
      });

      const hidden: number[] = [];

      const subscription = pubsub
        .subscribeFor(4, ServerEvents.CHANNEL_DELETE)
        .subscribe({
          next: (channelId) => {
            hidden.push(channelId);
          }
        });

      try {
        await caller.voice.leave();

        expect(hidden).toEqual([PRIVATE_VOICE_CHANNEL_ID]);
      } finally {
        subscription.unsubscribe();
        await runtime.destroy();
      }
    });

    test('should refuse joining a dm channel as a voice channel', async () => {
      const { caller } = await initTest(3);

      await expect(
        caller.voice.join({
          channelId: DM_CHANNEL_ID,
          state: { micMuted: false, soundMuted: false }
        })
      ).rejects.toThrow(
        'Cannot join a direct message channel as a voice channel'
      );
    });
  });

  // every route below opens with getCurrentVoiceRuntime. the transports and producers they go
  // on to touch need mediasoup, but the guard itself runs before any of that, so the three
  // ways it refuses are reachable. inputs only have to satisfy zod, which runs first
  describe('getCurrentVoiceRuntime', () => {
    const guardedCalls = (caller: TVoiceCaller) => ({
      leave: () => caller.voice.leave(),
      updateState: () => caller.voice.updateState({ micMuted: true }),
      createProducerTransport: () => caller.voice.createProducerTransport(),
      createConsumerTransport: () => caller.voice.createConsumerTransport(),
      connectProducerTransport: () =>
        caller.voice.connectProducerTransport({ dtlsParameters: {} }),
      connectConsumerTransport: () =>
        caller.voice.connectConsumerTransport({ dtlsParameters: {} }),
      produce: () =>
        caller.voice.produce({
          transportId: 'transport',
          kind: StreamKind.AUDIO,
          rtpParameters: {}
        }),
      consume: () =>
        caller.voice.consume({
          kind: StreamKind.AUDIO,
          remoteId: 1,
          rtpCapabilities: {}
        }),
      setConsumerQuality: () =>
        caller.voice.setConsumerQuality({
          remoteId: 1,
          kind: StreamKind.VIDEO,
          quality: { mode: 'auto' }
        }),
      getProducers: () => caller.voice.getProducers(),
      sendReaction: () => caller.voice.sendReaction({ emoji: 'thumbsup' }),
      startDirectScreenShare: () =>
        caller.voice.startDirectScreenShare({
          sessionId: DIRECT_TEST_SESSION,
          attempt: 1,
          description: { type: 'offer', sdp: 'offer' }
        }),
      signalDirectScreenShare: () =>
        caller.voice.signalDirectScreenShare({
          type: 'candidate',
          sharerId: 1,
          sessionId: DIRECT_TEST_SESSION,
          attempt: 1,
          candidate: { candidate: '' }
        }),
      stopDirectScreenShare: () =>
        caller.voice.stopDirectScreenShare({
          sessionId: DIRECT_TEST_SESSION,
          attempt: 1
        })
    });

    test('should refuse every guarded route when the user is not in a voice channel', async () => {
      const { caller } = await initTest(1);

      for (const [name, call] of Object.entries(guardedCalls(caller))) {
        await expect(call(), name).rejects.toThrow(
          'User is not in a voice channel'
        );
      }
    });

    test('should refuse every guarded route when the runtime is gone', async () => {
      const { caller } = await initTest(1, undefined, {
        currentVoiceChannelId: PRIVATE_VOICE_CHANNEL_ID
      });

      for (const [name, call] of Object.entries(guardedCalls(caller))) {
        await expect(call(), name).rejects.toThrow(
          'Voice runtime not found for this channel'
        );
      }
    });

    test('should refuse every guarded route without the global voice permission', async () => {
      const defaultRole = await tdb
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.isDefault, true))
        .get();

      await tdb
        .delete(rolePermissions)
        .where(
          and(
            eq(rolePermissions.roleId, defaultRole!.id),
            eq(rolePermissions.permission, Permission.JOIN_VOICE_CHANNELS)
          )
        )
        .execute();

      const { caller } = await initTest(2, undefined, {
        currentVoiceChannelId: 2
      });

      for (const [name, call] of Object.entries(guardedCalls(caller))) {
        await expect(call(), name).rejects.toThrow('Insufficient permissions');
      }
    });
  });

  // the producers themselves need mediasoup, but the runtime only ever calls close() and its
  // close observer on them, so a stand-in is enough to check the route does the bookkeeping:
  // drop it from the runtime and tell the rest of the channel it is gone
  describe('closeProducer', () => {
    const createFakeProducer = () => {
      const closeListeners: (() => void)[] = [];
      const state = { closed: false };

      const producer = {
        kind: 'audio',
        observer: {
          on: (event: string, listener: () => void) => {
            if (event === 'close') closeListeners.push(listener);
          }
        },
        close: () => {
          state.closed = true;
          closeListeners.forEach((listener) => listener());
        }
      } as unknown as Parameters<VoiceRuntime['addProducer']>[2];

      return { producer, state };
    };

    const withProducer = async () => {
      const runtime = new VoiceRuntime(2);
      const { producer, state } = createFakeProducer();

      runtime.addUser(2, { micMuted: false, soundMuted: false });
      runtime.addProducer(2, StreamKind.AUDIO, producer);

      const { caller } = await initTest(2, undefined, {
        currentVoiceChannelId: 2
      });

      return { runtime, caller, state };
    };

    test('should close the producer and tell the rest of the channel', async () => {
      const { runtime, caller, state } = await withProducer();

      const closures: { remoteId: number; kind: StreamKind }[] = [];

      const subscription = pubsub
        .subscribeForChannel(2, ServerEvents.VOICE_PRODUCER_CLOSED)
        .subscribe({
          next: ({ remoteId, kind }) => {
            closures.push({ remoteId, kind });
          }
        });

      try {
        await caller.voice.closeProducer({ kind: StreamKind.AUDIO });

        expect(state.closed).toBe(true);
        expect(runtime.getProducer(StreamKind.AUDIO, 2)).toBeUndefined();
        expect(closures).toEqual([{ remoteId: 2, kind: StreamKind.AUDIO }]);
      } finally {
        subscription.unsubscribe();
        await runtime.destroy();
      }
    });

    // the client fires this on mute and on leaving, so the two can race. arriving late has to
    // be a no-op rather than an error the user sees
    test('should ignore a close from a user who already left voice', async () => {
      const { caller } = await initTest(2);

      await expect(
        caller.voice.closeProducer({ kind: StreamKind.AUDIO })
      ).resolves.toBeUndefined();
    });

    test('should ignore a close for a producer that is already gone', async () => {
      const runtime = new VoiceRuntime(2);

      runtime.addUser(2, { micMuted: false, soundMuted: false });

      const { caller } = await initTest(2, undefined, {
        currentVoiceChannelId: 2
      });

      try {
        await expect(
          caller.voice.closeProducer({ kind: StreamKind.SCREEN })
        ).resolves.toBeUndefined();
      } finally {
        await runtime.destroy();
      }
    });

    test('should refuse a close when the runtime is gone', async () => {
      const { caller } = await initTest(2, undefined, {
        currentVoiceChannelId: PRIVATE_VOICE_CHANNEL_ID
      });

      await expect(
        caller.voice.closeProducer({ kind: StreamKind.AUDIO })
      ).rejects.toThrow('Voice runtime not found for this channel');
    });
  });

  describe('produce', () => {
    test('should refuse a screen share without SHARE_SCREEN', async () => {
      await revokeFromDefaultRole(Permission.SHARE_SCREEN);

      const { runtime, caller } = await joinVoiceChannelTwo(2);

      try {
        await expect(
          caller.voice.produce({
            transportId: 'transport',
            kind: StreamKind.SCREEN,
            rtpParameters: {}
          })
        ).rejects.toThrow('Insufficient permissions');
      } finally {
        await runtime.destroy();
      }
    });

    test('should refuse screen audio without SHARE_SCREEN', async () => {
      await revokeFromDefaultRole(Permission.SHARE_SCREEN);

      const { runtime, caller } = await joinVoiceChannelTwo(2);

      try {
        await expect(
          caller.voice.produce({
            transportId: 'transport',
            kind: StreamKind.SCREEN_AUDIO,
            rtpParameters: {}
          })
        ).rejects.toThrow('Insufficient permissions');
      } finally {
        await runtime.destroy();
      }
    });

    test('should refuse a webcam stream without ENABLE_WEBCAM', async () => {
      await revokeFromDefaultRole(Permission.ENABLE_WEBCAM);

      const { runtime, caller } = await joinVoiceChannelTwo(2);

      try {
        await expect(
          caller.voice.produce({
            transportId: 'transport',
            kind: StreamKind.VIDEO,
            rtpParameters: {}
          })
        ).rejects.toThrow('Insufficient permissions');
      } finally {
        await runtime.destroy();
      }
    });
    test('should refuse the external stream kinds outright', async () => {
      const { runtime, caller } = await joinVoiceChannelTwo(2);

      try {
        await expect(
          caller.voice.produce({
            transportId: 'transport',
            kind: StreamKind.EXTERNAL_AUDIO as never,
            rtpParameters: {}
          })
        ).rejects.toThrow();
      } finally {
        await runtime.destroy();
      }
    });

    test('should pass the permission checks when the user holds them', async () => {
      const { runtime, caller } = await joinVoiceChannelTwo(2);

      try {
        await expect(
          caller.voice.produce({
            transportId: 'transport',
            kind: StreamKind.SCREEN,
            rtpParameters: {}
          })
        ).rejects.toThrow('Producer transport not found');
      } finally {
        await runtime.destroy();
      }
    });
  });

  describe('updateState', () => {
    test('should apply a state change the user is allowed to make', async () => {
      const { runtime, caller } = await joinVoiceChannelTwo(2);

      try {
        await caller.voice.updateState({ micMuted: true, soundMuted: true });

        expect(runtime.getUserState(2)).toMatchObject({
          micMuted: true,
          soundMuted: true
        });
      } finally {
        await runtime.destroy();
      }
    });

    // a public channel grants every channel permission outright, so the filtering only has
    // anything to do on a private one. view has to be granted or the guard would refuse the
    // whole call and the dropped fields would prove nothing
    test('should drop the fields the user has no channel permission for', async () => {
      const defaultRole = await tdb
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.isDefault, true))
        .get();

      await tdb.insert(channelRolePermissions).values({
        channelId: PRIVATE_VOICE_CHANNEL_ID,
        roleId: defaultRole!.id,
        permission: ChannelPermission.VIEW_CHANNEL,
        allow: true,
        createdAt: Date.now()
      });

      const runtime = new VoiceRuntime(PRIVATE_VOICE_CHANNEL_ID);

      runtime.addUser(2, { micMuted: false, soundMuted: false });

      const { caller } = await initTest(2, undefined, {
        currentVoiceChannelId: PRIVATE_VOICE_CHANNEL_ID
      });

      try {
        await caller.voice.updateState({
          micMuted: true,
          webcamEnabled: true,
          sharingScreen: true,
          soundMuted: true
        });

        // sound muting is the user's own playback, so it is never gated
        expect(runtime.getUserState(2)).toMatchObject({
          micMuted: false,
          webcamEnabled: false,
          sharingScreen: false,
          soundMuted: true
        });
      } finally {
        await runtime.destroy();
      }
    });
  });

  describe('sendReaction', () => {
    test('should broadcast the reaction to every listener', async () => {
      const { runtime, caller } = await joinVoiceChannelTwo(1);

      const reactions: {
        channelId: number;
        userId: number;
        emoji: string;
      }[] = [];

      const subscription = pubsub
        .subscribe(ServerEvents.USER_VOICE_REACTION)
        .subscribe({
          next: (reaction) => {
            reactions.push(reaction);
          }
        });

      try {
        await caller.voice.sendReaction({ emoji: 'tada' });

        expect(reactions).toEqual([
          { channelId: VOICE_CHANNEL_ID, userId: 1, emoji: 'tada' }
        ]);
      } finally {
        subscription.unsubscribe();
        await runtime.destroy();
      }
    });

    test('should accept any emoji character or shortcode the picker sends', async () => {
      const { runtime, caller } = await joinVoiceChannelTwo(1);

      try {
        for (const emoji of ['💩', 'fox', 'partying_face']) {
          await expect(
            caller.voice.sendReaction({ emoji })
          ).resolves.toBeUndefined();
        }
      } finally {
        await runtime.destroy();
      }
    });

    test('should refuse a reaction that is neither an emoji nor a shortcode', async () => {
      const { runtime, caller } = await joinVoiceChannelTwo(1);

      try {
        for (const emoji of ['not an emoji', '<b>x</b>', 'Lol!', '../etc']) {
          await expect(caller.voice.sendReaction({ emoji })).rejects.toThrow(
            'Unknown emoji'
          );
        }
      } finally {
        await runtime.destroy();
      }
    });

    test('should refuse a reaction longer than the emoji limit', async () => {
      const { runtime, caller } = await joinVoiceChannelTwo(1);

      try {
        await expect(
          caller.voice.sendReaction({
            emoji: 'a'.repeat(REACTION_EMOJI_MAX_LENGTH + 1)
          })
        ).rejects.toThrow();
      } finally {
        await runtime.destroy();
      }
    });

    test('should refuse a reaction without SEND_VOICE_REACTION', async () => {
      await revokeFromDefaultRole(Permission.SEND_VOICE_REACTION);

      const { runtime, caller } = await joinVoiceChannelTwo(2);

      try {
        await expect(
          caller.voice.sendReaction({ emoji: 'thumbsup' })
        ).rejects.toThrow('Insufficient permissions');
      } finally {
        await runtime.destroy();
      }
    });

    test('should rate limit reaction spam', async () => {
      const { runtime, caller } = await joinVoiceChannelTwo(2);

      try {
        for (
          let i = 0;
          i < config.rateLimiters.voiceReaction.maxRequests;
          i++
        ) {
          await caller.voice
            .sendReaction({ emoji: 'thumbsup' })
            .catch(() => {});
        }

        await expect(
          caller.voice.sendReaction({ emoji: 'thumbsup' })
        ).rejects.toThrow('Too many requests. Please try again shortly.');
      } finally {
        await runtime.destroy();
      }
    });
  });
});

const DIRECT_TEST_SESSION = 'e46211da-c12b-4f3e-b72e-2b385ea90cf7';

describe('direct screen share routes', () => {
  const offerInput = {
    sessionId: DIRECT_TEST_SESSION,
    attempt: 1,
    description: { type: 'offer' as const, sdp: 'offer sdp' }
  };

  const answerInput = {
    type: 'answer' as const,
    sharerId: 1,
    sessionId: DIRECT_TEST_SESSION,
    attempt: 1,
    description: { type: 'answer' as const, sdp: 'answer sdp' }
  };

  test('should treat a legacy voice join as unsupported and return ICE servers', async () => {
    const runtime = new VoiceRuntime(VOICE_CHANNEL_ID);
    await runtime.init();
    const { caller } = await initTest(1);

    try {
      const result = await caller.voice.join({
        channelId: VOICE_CHANNEL_ID,
        state: { micMuted: false, soundMuted: false }
      });

      expect(runtime.getUserState(1).supportsDirectScreenShare).toBe(false);
      expect(result.iceServers).toEqual(
        JSON.parse(config.peerToPeer.iceServers)
      );

      await caller.voice.leave();
    } finally {
      await runtime.destroy();
    }
  });

  test('should reject invalid start payloads', async () => {
    const { caller } = await initTest(1);
    const invalidInputs = [
      { description: { type: 'offer', sdp: 'offer sdp' } },
      {
        sessionId: DIRECT_TEST_SESSION,
        attempt: 0,
        description: { type: 'offer', sdp: 'offer sdp' }
      },
      {
        sessionId: DIRECT_TEST_SESSION,
        attempt: 11,
        description: { type: 'offer', sdp: 'offer sdp' }
      },
      {
        sessionId: DIRECT_TEST_SESSION,
        attempt: 1,
        description: { type: 'answer', sdp: 'answer sdp' }
      },
      {
        sessionId: DIRECT_TEST_SESSION,
        attempt: 1,
        description: { type: 'offer', sdp: '' }
      },
      {
        sessionId: DIRECT_TEST_SESSION,
        attempt: 1,
        description: { type: 'offer', sdp: 's'.repeat(65_537) }
      }
    ];

    for (const input of invalidInputs) {
      await expect(
        caller.voice.startDirectScreenShare(input as never)
      ).rejects.toThrow();
    }
  });

  test('should reject invalid signal payloads', async () => {
    const { caller } = await initTest(1);
    const invalidInputs = [
      { ...answerInput, sharerId: 0 },
      { ...answerInput, attempt: 0 },
      { ...answerInput, attempt: 11 },
      {
        ...answerInput,
        description: { type: 'offer', sdp: 'offer sdp' }
      },
      {
        ...answerInput,
        description: { type: 'answer', sdp: '' }
      },
      {
        ...answerInput,
        description: { type: 'answer', sdp: 's'.repeat(65_537) }
      },
      {
        type: 'candidate',
        sharerId: 1,
        sessionId: DIRECT_TEST_SESSION,
        attempt: 1,
        candidate: { candidate: 'c'.repeat(4097) }
      },
      {
        type: 'candidate',
        sharerId: 1,
        sessionId: DIRECT_TEST_SESSION,
        attempt: 1,
        candidate: { candidate: '', sdpMid: 'm'.repeat(257) }
      },
      {
        type: 'candidate',
        sharerId: 1,
        sessionId: DIRECT_TEST_SESSION,
        attempt: 1,
        candidate: { candidate: '', sdpMLineIndex: -1 }
      },
      {
        type: 'candidate',
        sharerId: 1,
        sessionId: DIRECT_TEST_SESSION,
        attempt: 1,
        candidate: { candidate: '', sdpMLineIndex: 1.5 }
      },
      {
        type: 'candidate',
        sharerId: 1,
        sessionId: DIRECT_TEST_SESSION,
        attempt: 1,
        candidate: { candidate: '', usernameFragment: 'u'.repeat(257) }
      }
    ];

    for (const input of invalidInputs) {
      await expect(
        caller.voice.signalDirectScreenShare(input as never)
      ).rejects.toThrow();
    }
  });

  test('should reject a stop payload that is not an object', async () => {
    const { caller } = await initTest(1);

    await expect(
      caller.voice.stopDirectScreenShare(null as never)
    ).rejects.toThrow();
  });

  test('should create a supported 1:1 share and deliver the offer to its peer', async () => {
    const runtime = createDirectScreenShareRuntime([1, 2]);
    const { caller } = await initVoiceCaller(1);
    const received: unknown[] = [];
    const subscription = pubsub
      .subscribeFor(2, ServerEvents.VOICE_P2P_SCREEN_SHARE_SIGNAL)
      .subscribe({ next: (signal) => received.push(signal) });

    try {
      await expect(
        caller.voice.startDirectScreenShare(offerInput)
      ).resolves.toEqual({ peerUserId: 2 });

      expect(runtime.getDirectScreenSharePeer(1)).toBe(2);
      expect(received).toEqual([
        {
          channelId: VOICE_CHANNEL_ID,
          senderId: 1,
          sharerId: 1,
          type: 'offer',
          sessionId: DIRECT_TEST_SESSION,
          attempt: 1,
          description: offerInput.description
        }
      ]);
    } finally {
      subscription.unsubscribe();
      await runtime.destroy();
    }
  });

  test('should replay the active offer when the receiver subscribes late', async () => {
    const runtime = createDirectScreenShareRuntime([1, 2]);
    const { caller: sharerCaller } = await initVoiceCaller(1);
    const { caller: receiverCaller } = await initVoiceCaller(2);
    const received: unknown[] = [];

    try {
      await sharerCaller.voice.startDirectScreenShare(offerInput);

      const signalStream =
        await receiverCaller.voice.onDirectScreenShareSignal();
      const subscription = signalStream.subscribe({
        next: (signal) => received.push(signal)
      });

      expect(received).toEqual([
        {
          channelId: VOICE_CHANNEL_ID,
          senderId: 1,
          sharerId: 1,
          type: 'offer',
          sessionId: DIRECT_TEST_SESSION,
          attempt: 1,
          description: offerInput.description
        }
      ]);

      subscription.unsubscribe();
    } finally {
      await runtime.destroy();
    }
  });

  test('should allow newer attempts for the same share and reject stale signals', async () => {
    const runtime = createDirectScreenShareRuntime([1, 2]);
    const { caller: sharerCaller } = await initVoiceCaller(1);
    const { caller: receiverCaller } = await initVoiceCaller(2);
    const receivedBySharer: unknown[] = [];
    const receivedByReceiver: unknown[] = [];
    const sharerSubscription = pubsub
      .subscribeFor(1, ServerEvents.VOICE_P2P_SCREEN_SHARE_SIGNAL)
      .subscribe({ next: (signal) => receivedBySharer.push(signal) });
    const receiverSubscription = pubsub
      .subscribeFor(2, ServerEvents.VOICE_P2P_SCREEN_SHARE_SIGNAL)
      .subscribe({ next: (signal) => receivedByReceiver.push(signal) });

    try {
      await expect(
        sharerCaller.voice.startDirectScreenShare(offerInput)
      ).resolves.toEqual({ peerUserId: 2 });
      await expect(
        sharerCaller.voice.startDirectScreenShare({
          ...offerInput,
          sessionId: DIRECT_TEST_SESSION,
          attempt: 2,
          description: { type: 'offer', sdp: 'offer attempt 2' }
        })
      ).resolves.toEqual({ peerUserId: 2 });

      expect(runtime.getDirectScreenShareAttempt(1)).toBe(2);

      await expect(
        receiverCaller.voice.signalDirectScreenShare(answerInput)
      ).rejects.toThrow(
        'Direct screen share signal belongs to an inactive attempt'
      );
      await expect(
        sharerCaller.voice.signalDirectScreenShare({
          type: 'candidate',
          sharerId: 1,
          sessionId: DIRECT_TEST_SESSION,
          attempt: 1,
          candidate: { candidate: 'stale candidate' }
        })
      ).rejects.toThrow(
        'Direct screen share signal belongs to an inactive attempt'
      );

      await receiverCaller.voice.signalDirectScreenShare({
        ...answerInput,
        attempt: 2
      });
      await sharerCaller.voice.signalDirectScreenShare({
        type: 'candidate',
        sharerId: 1,
        sessionId: DIRECT_TEST_SESSION,
        attempt: 2,
        candidate: { candidate: 'current candidate' }
      });

      expect(receivedByReceiver).toContainEqual(
        expect.objectContaining({ type: 'offer', attempt: 1 })
      );
      expect(receivedByReceiver).toContainEqual(
        expect.objectContaining({ type: 'offer', attempt: 2 })
      );
      expect(receivedByReceiver).toContainEqual(
        expect.objectContaining({ type: 'candidate', attempt: 2 })
      );
      expect(receivedBySharer).toContainEqual(
        expect.objectContaining({ type: 'answer', attempt: 2 })
      );
    } finally {
      sharerSubscription.unsubscribe();
      receiverSubscription.unsubscribe();
      await runtime.destroy();
    }
  });

  test('should reject a skipped first attempt and allow a fresh session', async () => {
    const runtime = createDirectScreenShareRuntime([1, 2]);
    const { caller } = await initVoiceCaller(1);
    const received: unknown[] = [];
    const subscription = pubsub
      .subscribeFor(2, ServerEvents.VOICE_P2P_SCREEN_SHARE_SIGNAL)
      .subscribe({ next: (signal) => received.push(signal) });

    try {
      await expect(
        caller.voice.startDirectScreenShare({
          ...offerInput,
          attempt: 2
        })
      ).rejects.toThrow('A direct screen share is already active');

      expect(runtime.getDirectScreenSharePeer(1)).toBeUndefined();
      expect(received).toEqual([]);
      await expect(
        caller.voice.startDirectScreenShare(offerInput)
      ).resolves.toEqual({ peerUserId: 2 });
    } finally {
      subscription.unsubscribe();
      await runtime.destroy();
    }
  });

  test('should advance sequentially through ten and keep duplicate offers idempotent', async () => {
    const runtime = createDirectScreenShareRuntime([1, 2]);
    const { caller } = await initVoiceCaller(1);
    const received: unknown[] = [];
    const subscription = pubsub
      .subscribeFor(2, ServerEvents.VOICE_P2P_SCREEN_SHARE_SIGNAL)
      .subscribe({ next: (signal) => received.push(signal) });

    try {
      await caller.voice.startDirectScreenShare(offerInput);
      await expect(
        caller.voice.startDirectScreenShare(offerInput)
      ).resolves.toEqual({ peerUserId: 2 });
      expect(received).toHaveLength(1);
      await expect(
        caller.voice.startDirectScreenShare({ ...offerInput, attempt: 3 })
      ).rejects.toThrow('Direct screen share retry is not valid');
      await expect(
        caller.voice.startDirectScreenShare({
          ...offerInput,
          sessionId: crypto.randomUUID(),
          attempt: 2
        })
      ).rejects.toThrow('Direct screen share retry is not valid');

      for (let attempt = 2; attempt <= 10; attempt += 1) {
        await caller.voice.startDirectScreenShare({ ...offerInput, attempt });
      }

      expect(runtime.getDirectScreenShareAttempt(1)).toBe(10);
      expect(received).toHaveLength(10);
      await expect(
        caller.voice.startDirectScreenShare({ ...offerInput, attempt: 9 })
      ).rejects.toThrow('Direct screen share retry is not valid');
      await expect(
        caller.voice.startDirectScreenShare({
          ...offerInput,
          attempt: 10,
          description: { type: 'offer', sdp: 'different' }
        })
      ).rejects.toThrow('A direct screen share is already active');
    } finally {
      subscription.unsubscribe();
      await runtime.destroy();
    }
  });

  test('should reject a stale stop and signal from a previous share', async () => {
    const runtime = createDirectScreenShareRuntime([1, 2]);
    const { caller: sharer } = await initVoiceCaller(1);
    const { caller: receiver } = await initVoiceCaller(2);
    const newSessionId = crypto.randomUUID();

    try {
      await sharer.voice.startDirectScreenShare(offerInput);
      await sharer.voice.stopDirectScreenShare({
        sessionId: DIRECT_TEST_SESSION,
        attempt: 1
      });
      await sharer.voice.startDirectScreenShare({
        ...offerInput,
        sessionId: newSessionId
      });
      await expect(
        sharer.voice.stopDirectScreenShare({
          sessionId: DIRECT_TEST_SESSION,
          attempt: 1
        })
      ).rejects.toThrow(
        'Direct screen share stop belongs to an inactive attempt'
      );
      await expect(
        receiver.voice.signalDirectScreenShare(answerInput)
      ).rejects.toThrow(
        'Direct screen share signal belongs to an inactive attempt'
      );
      expect(runtime.getDirectScreenShareSession(1)).toBe(newSessionId);
      expect(runtime.getDirectScreenSharePeer(1)).toBe(2);
    } finally {
      await runtime.destroy();
    }
  });

  test('should require global screen share permission to start', async () => {
    await revokeFromDefaultRole(Permission.SHARE_SCREEN);
    const runtime = createDirectScreenShareRuntime([2, 3]);
    const { caller } = await initVoiceCaller(2);

    try {
      await expect(
        caller.voice.startDirectScreenShare(offerInput)
      ).rejects.toThrow('Insufficient permissions');
    } finally {
      await runtime.destroy();
    }
  });

  test('should require channel screen share permission to start', async () => {
    await grantPrivateChannelViewToDefaultRole(PRIVATE_VOICE_CHANNEL_ID);
    const runtime = createDirectScreenShareRuntime(
      [2, 3],
      [2, 3],
      PRIVATE_VOICE_CHANNEL_ID
    );
    const { caller } = await initVoiceCaller(2, PRIVATE_VOICE_CHANNEL_ID);

    try {
      await expect(
        caller.voice.startDirectScreenShare(offerInput)
      ).rejects.toThrow('Insufficient channel permissions');
    } finally {
      await runtime.destroy();
    }
  });

  test('should require the sharer to be a channel participant', async () => {
    const runtime = createDirectScreenShareRuntime([2, 3]);
    const { caller } = await initVoiceCaller(1);

    try {
      await expect(
        caller.voice.startDirectScreenShare(offerInput)
      ).rejects.toThrow('User is not in this voice channel');
    } finally {
      await runtime.destroy();
    }
  });

  test('should only start when the voice channel has exactly two participants', async () => {
    for (const userIds of [[1], [1, 2, 3]]) {
      const runtime = createDirectScreenShareRuntime(userIds);
      const { caller } = await initVoiceCaller(1);

      try {
        await expect(
          caller.voice.startDirectScreenShare(offerInput)
        ).rejects.toThrow(
          'Direct screen sharing is only available with two participants'
        );
      } finally {
        await runtime.destroy();
      }
    }
  });

  test('should require both participants to declare direct screen share support', async () => {
    for (const supportedUserIds of [[1], [2]]) {
      const runtime = createDirectScreenShareRuntime([1, 2], supportedUserIds);
      const { caller } = await initVoiceCaller(1);

      try {
        await expect(
          caller.voice.startDirectScreenShare(offerInput)
        ).rejects.toThrow(
          'Both participants must support direct screen sharing'
        );
      } finally {
        await runtime.destroy();
      }
    }
  });

  test('should refuse a second share while the sharer already has one active', async () => {
    const runtime = createDirectScreenShareRuntime([1, 2]);
    runtime.startDirectScreenShare(1, 2, 1, undefined, DIRECT_TEST_SESSION);
    const { caller } = await initVoiceCaller(1);

    try {
      await expect(
        caller.voice.startDirectScreenShare(offerInput)
      ).rejects.toThrow('A direct screen share is already active');
    } finally {
      await runtime.destroy();
    }
  });

  test('should refuse a new share when its receiver is already in a share', async () => {
    const runtime = createDirectScreenShareRuntime([1, 2]);
    runtime.startDirectScreenShare(3, 2, 1, undefined, DIRECT_TEST_SESSION);
    const { caller } = await initVoiceCaller(1);

    try {
      await expect(
        caller.voice.startDirectScreenShare(offerInput)
      ).rejects.toThrow('A direct screen share is already active');
    } finally {
      await runtime.destroy();
    }
  });

  test('should allow end of candidates in a signal and relay answers and candidates to the peer', async () => {
    const runtime = createDirectScreenShareRuntime([1, 2]);
    runtime.startDirectScreenShare(1, 2, 1, undefined, DIRECT_TEST_SESSION);
    const { caller: sharerCaller } = await initVoiceCaller(1);
    const { caller: receiverCaller } = await initVoiceCaller(2);
    const receivedBySharer: unknown[] = [];
    const receivedByReceiver: unknown[] = [];
    const sharerSubscription = pubsub
      .subscribeFor(1, ServerEvents.VOICE_P2P_SCREEN_SHARE_SIGNAL)
      .subscribe({ next: (signal) => receivedBySharer.push(signal) });
    const receiverSubscription = pubsub
      .subscribeFor(2, ServerEvents.VOICE_P2P_SCREEN_SHARE_SIGNAL)
      .subscribe({ next: (signal) => receivedByReceiver.push(signal) });

    try {
      await receiverCaller.voice.signalDirectScreenShare(answerInput);
      await sharerCaller.voice.signalDirectScreenShare({
        type: 'candidate',
        sharerId: 1,
        sessionId: DIRECT_TEST_SESSION,
        attempt: 1,
        candidate: { candidate: '' }
      });

      expect(receivedBySharer).toEqual([
        {
          channelId: VOICE_CHANNEL_ID,
          senderId: 2,
          sharerId: 1,
          type: 'answer',
          sessionId: DIRECT_TEST_SESSION,
          attempt: 1,
          description: answerInput.description
        }
      ]);
      expect(receivedByReceiver).toEqual([
        {
          channelId: VOICE_CHANNEL_ID,
          senderId: 1,
          sharerId: 1,
          type: 'candidate',
          sessionId: DIRECT_TEST_SESSION,
          attempt: 1,
          candidate: { candidate: '' }
        }
      ]);
    } finally {
      sharerSubscription.unsubscribe();
      receiverSubscription.unsubscribe();
      await runtime.destroy();
    }
  });

  test('should require the caller to be in the voice runtime before signalling', async () => {
    const runtime = createDirectScreenShareRuntime([2, 3]);
    runtime.startDirectScreenShare(2, 3, 1, undefined, DIRECT_TEST_SESSION);
    const { caller } = await initVoiceCaller(1);

    try {
      await expect(
        caller.voice.signalDirectScreenShare({
          type: 'candidate',
          sharerId: 2,
          sessionId: DIRECT_TEST_SESSION,
          attempt: 1,
          candidate: { candidate: '' }
        })
      ).rejects.toThrow('User is not in this voice channel');
    } finally {
      await runtime.destroy();
    }
  });

  test('should reject signalling when there is no matching negotiation', async () => {
    const runtime = createDirectScreenShareRuntime([1, 2]);
    const { caller } = await initVoiceCaller(2);

    try {
      await expect(
        caller.voice.signalDirectScreenShare(answerInput)
      ).rejects.toThrow('Direct screen share negotiation was not found');
    } finally {
      await runtime.destroy();
    }
  });

  test('should require both negotiation participants to support direct sharing', async () => {
    const runtime = createDirectScreenShareRuntime([1, 2], [1]);
    runtime.startDirectScreenShare(1, 2, 1, undefined, DIRECT_TEST_SESSION);
    const { caller } = await initVoiceCaller(2);

    try {
      await expect(
        caller.voice.signalDirectScreenShare(answerInput)
      ).rejects.toThrow('Both participants must support direct screen sharing');
    } finally {
      await runtime.destroy();
    }
  });

  test('should only allow the receiving participant to answer an offer', async () => {
    const runtime = createDirectScreenShareRuntime([1, 2]);
    runtime.startDirectScreenShare(1, 2, 1, undefined, DIRECT_TEST_SESSION);
    const { caller } = await initVoiceCaller(1);

    try {
      await expect(
        caller.voice.signalDirectScreenShare(answerInput)
      ).rejects.toThrow('Only the receiving participant can answer an offer');
    } finally {
      await runtime.destroy();
    }
  });

  test('should reject a signal from a channel member outside the negotiation', async () => {
    const runtime = createDirectScreenShareRuntime([1, 2, 3]);
    runtime.startDirectScreenShare(1, 2, 1, undefined, DIRECT_TEST_SESSION);
    const { caller } = await initVoiceCaller(3);

    try {
      await expect(
        caller.voice.signalDirectScreenShare({
          type: 'candidate',
          sharerId: 1,
          sessionId: DIRECT_TEST_SESSION,
          attempt: 1,
          candidate: { candidate: '' }
        })
      ).rejects.toThrow('User is not part of this direct screen share');
    } finally {
      await runtime.destroy();
    }
  });

  test('should recheck the sharer global permission for every signal', async () => {
    await revokeFromDefaultRole(Permission.SHARE_SCREEN);
    const runtime = createDirectScreenShareRuntime([2, 3]);
    runtime.startDirectScreenShare(2, 3, 1, undefined, DIRECT_TEST_SESSION);
    const { caller } = await initVoiceCaller(3);

    try {
      await expect(
        caller.voice.signalDirectScreenShare({
          ...answerInput,
          sharerId: 2
        })
      ).rejects.toThrow('Insufficient permissions');
    } finally {
      await runtime.destroy();
    }
  });

  test('should recheck the sharer channel permission for every signal', async () => {
    await grantPrivateChannelViewToDefaultRole(PRIVATE_VOICE_CHANNEL_ID);
    const runtime = createDirectScreenShareRuntime(
      [2, 3],
      [2, 3],
      PRIVATE_VOICE_CHANNEL_ID
    );
    runtime.startDirectScreenShare(2, 3, 1, undefined, DIRECT_TEST_SESSION);
    const { caller } = await initVoiceCaller(3, PRIVATE_VOICE_CHANNEL_ID);

    try {
      await expect(
        caller.voice.signalDirectScreenShare({
          ...answerInput,
          sharerId: 2
        })
      ).rejects.toThrow('Insufficient channel permissions');
    } finally {
      await runtime.destroy();
    }
  });

  test('should require a participating sharer to stop a direct share', async () => {
    const runtime = createDirectScreenShareRuntime([2, 3]);
    runtime.startDirectScreenShare(2, 3, 1, undefined, DIRECT_TEST_SESSION);
    const { caller } = await initVoiceCaller(1);

    try {
      await expect(
        caller.voice.stopDirectScreenShare({
          sessionId: DIRECT_TEST_SESSION,
          attempt: 1
        })
      ).rejects.toThrow('User is not in this voice channel');
    } finally {
      await runtime.destroy();
    }
  });

  test('should require global screen share permission to stop', async () => {
    await revokeFromDefaultRole(Permission.SHARE_SCREEN);
    const runtime = createDirectScreenShareRuntime([2, 3]);
    runtime.startDirectScreenShare(2, 3, 1, undefined, DIRECT_TEST_SESSION);
    const { caller } = await initVoiceCaller(2);

    try {
      await expect(
        caller.voice.stopDirectScreenShare({
          sessionId: DIRECT_TEST_SESSION,
          attempt: 1
        })
      ).rejects.toThrow('Insufficient permissions');
    } finally {
      await runtime.destroy();
    }
  });

  test('should require channel screen share permission to stop', async () => {
    await grantPrivateChannelViewToDefaultRole(PRIVATE_VOICE_CHANNEL_ID);
    const runtime = createDirectScreenShareRuntime(
      [2, 3],
      [2, 3],
      PRIVATE_VOICE_CHANNEL_ID
    );
    runtime.startDirectScreenShare(2, 3, 1, undefined, DIRECT_TEST_SESSION);
    const { caller } = await initVoiceCaller(2, PRIVATE_VOICE_CHANNEL_ID);

    try {
      await expect(
        caller.voice.stopDirectScreenShare({
          sessionId: DIRECT_TEST_SESSION,
          attempt: 1
        })
      ).rejects.toThrow('Insufficient channel permissions');
    } finally {
      await runtime.destroy();
    }
  });

  test('should reject stopping when there is no matching negotiation', async () => {
    const runtime = createDirectScreenShareRuntime([1, 2]);
    const { caller } = await initVoiceCaller(1);

    try {
      await expect(
        caller.voice.stopDirectScreenShare({
          sessionId: DIRECT_TEST_SESSION,
          attempt: 1
        })
      ).rejects.toThrow('Direct screen share negotiation was not found');
    } finally {
      await runtime.destroy();
    }
  });

  test('should stop the negotiation and notify both participants', async () => {
    const runtime = createDirectScreenShareRuntime([1, 2]);
    runtime.startDirectScreenShare(1, 2, 1, undefined, DIRECT_TEST_SESSION);
    const { caller } = await initVoiceCaller(1);
    const sharerSignals: unknown[] = [];
    const receiverSignals: unknown[] = [];
    const sharerSubscription = pubsub
      .subscribeFor(1, ServerEvents.VOICE_P2P_SCREEN_SHARE_SIGNAL)
      .subscribe({ next: (signal) => sharerSignals.push(signal) });
    const receiverSubscription = pubsub
      .subscribeFor(2, ServerEvents.VOICE_P2P_SCREEN_SHARE_SIGNAL)
      .subscribe({ next: (signal) => receiverSignals.push(signal) });

    try {
      await expect(
        caller.voice.stopDirectScreenShare({
          sessionId: DIRECT_TEST_SESSION,
          attempt: 1
        })
      ).resolves.toBeUndefined();

      expect(runtime.getDirectScreenSharePeer(1)).toBeUndefined();
      expect(sharerSignals).toEqual([
        {
          channelId: VOICE_CHANNEL_ID,
          senderId: 1,
          sharerId: 1,
          type: 'stop',
          sessionId: DIRECT_TEST_SESSION,
          attempt: 1,
          reason: 'stopped'
        }
      ]);
      expect(receiverSignals).toEqual(sharerSignals);
    } finally {
      sharerSubscription.unsubscribe();
      receiverSubscription.unsubscribe();
      await runtime.destroy();
    }
  });

  test('should stop a direct share when the channel is no longer 1:1', async () => {
    const runtime = createDirectScreenShareRuntime([1, 2]);
    runtime.startDirectScreenShare(1, 2, 1, undefined, DIRECT_TEST_SESSION);
    const receivedBySharer: unknown[] = [];
    const receivedByReceiver: unknown[] = [];
    const sharerSubscription = pubsub
      .subscribeFor(1, ServerEvents.VOICE_P2P_SCREEN_SHARE_SIGNAL)
      .subscribe({ next: (signal) => receivedBySharer.push(signal) });
    const receiverSubscription = pubsub
      .subscribeFor(2, ServerEvents.VOICE_P2P_SCREEN_SHARE_SIGNAL)
      .subscribe({ next: (signal) => receivedByReceiver.push(signal) });

    try {
      runtime.addUser(3, {
        micMuted: false,
        soundMuted: false,
        supportsDirectScreenShare: true
      });

      expect(runtime.getDirectScreenSharePeer(1)).toBeUndefined();
      const stopSignal = {
        channelId: VOICE_CHANNEL_ID,
        senderId: 1,
        sharerId: 1,
        type: 'stop',
        sessionId: DIRECT_TEST_SESSION,
        attempt: 1,
        reason: 'channel-not-1:1'
      };
      expect(receivedBySharer).toEqual([stopSignal]);
      expect(receivedByReceiver).toEqual([stopSignal]);
    } finally {
      sharerSubscription.unsubscribe();
      receiverSubscription.unsubscribe();
      await runtime.destroy();
    }
  });

  test('should stop a direct share when either participant leaves', async () => {
    for (const leavingUserId of [1, 2]) {
      const runtime = createDirectScreenShareRuntime([1, 2]);
      runtime.startDirectScreenShare(1, 2, 1, undefined, DIRECT_TEST_SESSION);
      const receivedBySharer: unknown[] = [];
      const receivedByReceiver: unknown[] = [];
      const sharerSubscription = pubsub
        .subscribeFor(1, ServerEvents.VOICE_P2P_SCREEN_SHARE_SIGNAL)
        .subscribe({ next: (signal) => receivedBySharer.push(signal) });
      const receiverSubscription = pubsub
        .subscribeFor(2, ServerEvents.VOICE_P2P_SCREEN_SHARE_SIGNAL)
        .subscribe({ next: (signal) => receivedByReceiver.push(signal) });

      try {
        runtime.removeUser(leavingUserId);

        expect(runtime.getDirectScreenSharePeer(1)).toBeUndefined();
        const stopSignal = {
          channelId: VOICE_CHANNEL_ID,
          senderId: 1,
          sharerId: 1,
          type: 'stop',
          sessionId: DIRECT_TEST_SESSION,
          attempt: 1,
          reason: 'peer-left'
        };
        expect(receivedBySharer).toEqual([stopSignal]);
        expect(receivedByReceiver).toEqual([stopSignal]);
      } finally {
        sharerSubscription.unsubscribe();
        receiverSubscription.unsubscribe();
        await runtime.destroy();
      }
    }
  });

  test('should rate limit all direct screen share procedures', async () => {
    const { caller } = await initTest(1, undefined, {
      needsPermission: async () => {}
    });
    const calls = [
      () => caller.voice.startDirectScreenShare(offerInput),
      () =>
        caller.voice.signalDirectScreenShare({
          type: 'candidate',
          sharerId: 1,
          sessionId: DIRECT_TEST_SESSION,
          attempt: 1,
          candidate: { candidate: '' }
        }),
      () =>
        caller.voice.stopDirectScreenShare({
          sessionId: DIRECT_TEST_SESSION,
          attempt: 1
        })
    ];

    for (const call of calls) {
      for (let i = 0; i < config.rateLimiters.voiceStream.maxRequests; i++) {
        await expect(call()).rejects.toThrow('User is not in a voice channel');
      }

      await expect(call()).rejects.toThrow(
        'Too many requests. Please try again shortly.'
      );
    }
  });
});

// the client subscribes to these through a caller exactly like this, and the route binds
// ctx.currentVoiceChannelId at subscribe time. subscribing before voice.join has set it
// hands back an observable bound to no channel, which stays silent for the rest of the
// session and leaves a member hearing nothing until they rejoin
describe('voice producer subscriptions', () => {
  const collect = async (caller: TVoiceCaller) => {
    const received: { remoteId: number; kind: StreamKind }[] = [];

    const observable = await caller.voice.onNewProducer();

    const subscription = observable.subscribe({
      next: ({ remoteId, kind }) => received.push({ remoteId, kind })
    });

    return { received, subscription };
  };

  const announceExternalAudio = () => {
    pubsub.publishForChannel(
      VOICE_CHANNEL_ID,
      ServerEvents.VOICE_NEW_PRODUCER,
      {
        channelId: VOICE_CHANNEL_ID,
        remoteId: 0,
        kind: StreamKind.EXTERNAL_AUDIO
      }
    );
  };

  test('should deliver a producer to a subscriber already in the channel', async () => {
    const { caller } = await initTest(1, undefined, {
      currentVoiceChannelId: VOICE_CHANNEL_ID
    });

    const { received, subscription } = await collect(caller);

    try {
      announceExternalAudio();

      expect(received).toEqual([
        { remoteId: 0, kind: StreamKind.EXTERNAL_AUDIO }
      ]);
    } finally {
      subscription.unsubscribe();
    }
  });

  test('should stay silent forever when subscribed before the channel is set', async () => {
    const { caller } = await initTest(1);

    const { received, subscription } = await collect(caller);

    try {
      announceExternalAudio();

      expect(received).toEqual([]);
    } finally {
      subscription.unsubscribe();
    }
  });
});
