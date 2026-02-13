import { ActivityLogType, DisconnectCode, Permission } from '@sharkord/shared';
import { eq, inArray } from 'drizzle-orm';
import z from 'zod';
import { db } from '../../db';
import { removeFile } from '../../db/mutations/files';
import { getUserByIdentity } from '../../db/queries/users';
import { publishEmoji, publishMessage, publishUser } from '../../db/publishers';
import {
  emojis,
  files,
  messageFiles,
  messageReactions,
  messages,
  users
} from '../../db/schema';
import { enqueueActivityLog } from '../../queues/activity-log';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const DELETED_USER_IDENTITY = '__deleted_user__';
const DELETED_USER_NAME = 'Deleted';

const ensureDeletedUser = async (): Promise<{ userId: number; created: boolean }> => {
  const existingDeletedUser = await getUserByIdentity(DELETED_USER_IDENTITY);

  if (existingDeletedUser) {
    return {
      userId: existingDeletedUser.id,
      created: false
    };
  }

  const now = Date.now();

  const [insertedDeletedUser] = await db
    .insert(users)
    .values({
      identity: DELETED_USER_IDENTITY,
      password: DELETED_USER_IDENTITY,
      name: DELETED_USER_NAME,
      avatarId: null,
      bannerId: null,
      bio: null,
      banned: true,
      banReason: null,
      bannedAt: now,
      bannerColor: null,
      lastLoginAt: now,
      createdAt: now,
      updatedAt: now
    })
    .returning({ id: users.id });

  return {
    userId: insertedDeletedUser.id,
    created: true
  };
};

const deleteUserRoute = protectedProcedure
  .input(
    z.object({
      userId: z.number(),
      keepMessages: z.boolean().optional(),
      keepEmojisReactions: z.boolean().optional(),
      keepFiles: z.boolean().optional()
    })
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.MANAGE_USERS);

    invariant(input.userId !== ctx.user.id, {
      code: 'BAD_REQUEST',
      message: 'You cannot delete yourself.'
    });

    const targetUser = await db
      .select({
        id: users.id,
        avatarId: users.avatarId,
        bannerId: users.bannerId
      })
      .from(users)
      .where(eq(users.id, input.userId))
      .get();

    invariant(targetUser, {
      code: 'NOT_FOUND',
      message: 'User not found.'
    });

    // Close the websocket connection if the user is connected
    const userWs = ctx.getUserWs(input.userId);

    if (userWs) {
      userWs.close(DisconnectCode.KICKED, 'Your account has been deleted');
    }

    if (input.keepMessages || input.keepEmojisReactions || input.keepFiles) {
      const { userId: deletedUserId, created } = await ensureDeletedUser();

      invariant(deletedUserId !== input.userId, {
        code: 'BAD_REQUEST',
        message: 'Cannot delete the deleted user placeholder.'
      });

      if (created) {
        await publishUser(deletedUserId, 'create');
      }

      if (input.keepEmojisReactions) {
        const targetEmojiIds = await db
          .select({ id: emojis.id })
          .from(emojis)
          .where(eq(emojis.userId, input.userId))
          .all();

        if (targetEmojiIds.length > 0) {
          await db
            .update(emojis)
            .set({ userId: deletedUserId })
            .where(eq(emojis.userId, input.userId));

          for (const emoji of targetEmojiIds) {
            await publishEmoji(emoji.id, 'update');
          }
        }

        const reactedMessageIds = await db
          .select({ messageId: messageReactions.messageId })
          .from(messageReactions)
          .where(eq(messageReactions.userId, input.userId))
          .all();

        if (reactedMessageIds.length > 0) {
          await db
            .update(messageReactions)
            .set({ userId: deletedUserId })
            .where(eq(messageReactions.userId, input.userId));

          const uniqueReactedMessageIds = Array.from(
            new Set(reactedMessageIds.map((row) => row.messageId))
          );

          const reactedMessages = await db
            .select({
              id: messages.id,
              channelId: messages.channelId
            })
            .from(messages)
            .where(inArray(messages.id, uniqueReactedMessageIds))
            .all();

          for (const message of reactedMessages) {
            await publishMessage(message.id, message.channelId, 'update');
          }
        }
      }

      if (input.keepFiles) {
        const excludedFileIds = [targetUser.avatarId, targetUser.bannerId].filter(
          (fileId): fileId is number => fileId !== null
        );

        const userFiles = await db
          .select({ id: files.id })
          .from(files)
          .where(eq(files.userId, input.userId))
          .all();

        const fileIdsToKeep = userFiles
          .map((file) => file.id)
          .filter((fileId) => !excludedFileIds.includes(fileId));

        if (fileIdsToKeep.length > 0) {
          await db
            .update(files)
            .set({ userId: deletedUserId })
            .where(inArray(files.id, fileIdsToKeep));
        }
      } else {
        const userFiles = await db
          .select({ id: files.id })
          .from(files)
          .where(eq(files.userId, input.userId))
          .all();

        const userFileIds = userFiles.map((file) => file.id);

        if (userFileIds.length > 0) {
          const affectedMessageRows = await db
            .select({ messageId: messageFiles.messageId })
            .from(messageFiles)
            .where(inArray(messageFiles.fileId, userFileIds))
            .all();

          for (const file of userFiles) {
            await removeFile(file.id);
          }

          const affectedMessageIds = Array.from(
            new Set(affectedMessageRows.map((row) => row.messageId))
          );

          if (affectedMessageIds.length > 0) {
            const affectedMessages = await db
              .select({
                id: messages.id,
                channelId: messages.channelId
              })
              .from(messages)
              .where(inArray(messages.id, affectedMessageIds))
              .all();

            for (const message of affectedMessages) {
              await publishMessage(message.id, message.channelId, 'update');
            }
          }
        }
      }

      if (input.keepMessages) {
      const targetMessages = await db
        .select({
          id: messages.id,
          channelId: messages.channelId
        })
        .from(messages)
        .where(eq(messages.userId, input.userId))
        .all();

      if (targetMessages.length > 0) {
        await db
          .update(messages)
          .set({ userId: deletedUserId })
          .where(eq(messages.userId, input.userId));

        for (const message of targetMessages) {
          await publishMessage(message.id, message.channelId, 'update');
        }
      }
      }
    }

    // Delete the user from the database
    await db.delete(users).where(eq(users.id, input.userId));

    // Publish user deletion event
    publishUser(input.userId, 'delete');

    // Log the activity
    enqueueActivityLog({
      type: ActivityLogType.USER_DELETED,
      userId: input.userId,
      details: {
        reason: 'Your account has been deleted',
        deletedBy: ctx.userId
      }
    });
  });

export { deleteUserRoute };
