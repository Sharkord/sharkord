import {
  ChannelPermission,
  Permission,
  ServerEvents,
  StreamKind
} from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import { and, eq } from 'drizzle-orm';
import { initTest } from '../../__tests__/helpers';
import { tdb } from '../../__tests__/setup';
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
      getProducers: () => caller.voice.getProducers()
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

  describe('updateState', () => {
    const joinAsUser2 = async () => {
      const runtime = new VoiceRuntime(2);

      runtime.addUser(2, { micMuted: false, soundMuted: false });

      const { caller } = await initTest(2, undefined, {
        currentVoiceChannelId: 2
      });

      return { runtime, caller };
    };

    test('should apply a state change the user is allowed to make', async () => {
      const { runtime, caller } = await joinAsUser2();

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
});
