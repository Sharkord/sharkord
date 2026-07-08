import { ChannelPermission, ChannelType, Permission } from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import { and, eq } from 'drizzle-orm';
import { initTest } from '../../__tests__/helpers';
import { tdb } from '../../__tests__/setup';
import {
  channelRolePermissions,
  channels,
  rolePermissions,
  roles
} from '../../db/schema';
import { VoiceRuntime } from '../../runtimes/voice';

const createPrivateVoiceChannel = async () => {
  const [privateChannel] = await tdb
    .insert(channels)
    .values({
      type: ChannelType.VOICE,
      name: 'Private Voice',
      position: 99,
      private: true,
      createdAt: Date.now()
    })
    .returning();

  return privateChannel!;
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

      const privateChannel = await createPrivateVoiceChannel();

      await expect(
        caller.voice.moveUser({ userId: 4, channelId: privateChannel.id })
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

      const privateChannel = await createPrivateVoiceChannel();

      await tdb
        .insert(channelRolePermissions)
        .values({
          channelId: privateChannel.id,
          roleId: defaultRole!.id,
          permission: ChannelPermission.JOIN,
          allow: true,
          createdAt: Date.now()
        })
        .execute();

      await expect(
        caller.voice.moveUser({ userId: 4, channelId: privateChannel.id })
      ).rejects.toThrow('Insufficient channel permissions');
    });

    test('should allow moving a user into a channel they cannot access themselves', async () => {
      const { caller } = await initTest(1);

      const privateChannel = await createPrivateVoiceChannel();
      const originRuntime = new VoiceRuntime(2);

      originRuntime.addUser(4, { micMuted: false, soundMuted: false });

      try {
        await expect(
          caller.voice.moveUser({ userId: 4, channelId: privateChannel.id })
        ).resolves.toBeUndefined();
      } finally {
        await originRuntime.destroy();
      }
    });

    test('should let the moved user join the destination through the one-time grant', async () => {
      const { caller: ownerCaller } = await initTest(1);
      const { caller: movedCaller } = await initTest(4);

      const privateChannel = await createPrivateVoiceChannel();
      const originRuntime = new VoiceRuntime(2);
      const destinationRuntime = new VoiceRuntime(privateChannel.id);

      await destinationRuntime.init();

      originRuntime.addUser(4, { micMuted: false, soundMuted: false });

      const joinInput = {
        channelId: privateChannel.id,
        state: { micMuted: false, soundMuted: false }
      };

      try {
        await expect(movedCaller.voice.join(joinInput)).rejects.toThrow(
          'Insufficient channel permissions'
        );

        await ownerCaller.voice.moveUser({
          userId: 4,
          channelId: privateChannel.id
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
  });
});
