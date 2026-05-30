import { ChannelType, Permission } from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import { and, eq } from 'drizzle-orm';
import { initTest } from '../../__tests__/helpers';
import { tdb } from '../../__tests__/setup';
import { channels, rolePermissions, roles } from '../../db/schema';

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

    test('should reject when the target user cannot access the destination channel', async () => {
      const { caller } = await initTest(1);

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

      await expect(
        caller.voice.moveUser({ userId: 4, channelId: privateChannel!.id })
      ).rejects.toThrow('Target user cannot join the destination channel');
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
      ).rejects.toThrow('Target user cannot join the destination channel');
    });

    test('should reject when the target user is not in a voice channel', async () => {
      const { caller } = await initTest(1);

      await expect(
        caller.voice.moveUser({ userId: 4, channelId: 2 })
      ).rejects.toThrow('User is not in a voice channel');
    });
  });
});
