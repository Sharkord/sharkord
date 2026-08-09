import {
  ActivityLogType,
  DELETED_USER_IDENTITY_AND_NAME,
  DisconnectCode,
  Permission,
  ServerEvents
} from '@sharkord/shared';
import { and, eq, exists, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import z from 'zod';
import { db } from '../../db';
import { publishUser } from '../../db/publishers';
import { getUserByIdentity } from '../../db/queries/users';
import {
  emojis,
  files,
  messageReactions,
  messages,
  users
} from '../../db/schema';
import { assertCanActOnUser } from '../../helpers/assert-can-act-on-user';
import { enqueueActivityLog } from '../../queues/activity-log';
import { invariant } from '../../utils/invariant';
import { pubsub } from '../../utils/pubsub';
import { protectedProcedure } from '../../utils/trpc';

const placeholderReactions = alias(messageReactions, 'placeholder_reactions');

const ensureDeletedUser = async (): Promise<number> => {
  const existingDeletedUser = await getUserByIdentity(
    DELETED_USER_IDENTITY_AND_NAME
  );

  if (existingDeletedUser) {
    return existingDeletedUser.id;
  }

  const insertedDeletedUser = await db
    .insert(users)
    .values({
      identity: DELETED_USER_IDENTITY_AND_NAME,
      password: Bun.randomUUIDv7(),
      name: DELETED_USER_IDENTITY_AND_NAME,
      avatarId: null,
      bannerId: null,
      bio: null,
      createdAt: Date.now()
    })
    .returning({ id: users.id })
    .get();

  if (!insertedDeletedUser) {
    throw new Error('Failed to create deleted user placeholder');
  }

  await publishUser(insertedDeletedUser.id, 'create');

  return insertedDeletedUser.id;
};

const deleteUserRoute = protectedProcedure
  .input(
    z.object({
      userId: z.number(),
      wipe: z.boolean().default(false)
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
        identity: users.identity,
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

    invariant(targetUser.identity !== DELETED_USER_IDENTITY_AND_NAME, {
      code: 'BAD_REQUEST',
      message: 'Cannot delete the deleted user placeholder.'
    });

    await assertCanActOnUser(ctx.userId, input.userId);

    ctx
      .getUserWs(input.userId)
      .forEach((socket) =>
        socket.close(DisconnectCode.KICKED, 'Your account has been deleted')
      );

    const deletedUserId = await ensureDeletedUser();

    db.transaction((tx) => {
      if (!input.wipe) {
        // Reassign everything to deleted user placeholder

        tx.update(messages)
          .set({ userId: deletedUserId })
          .where(eq(messages.userId, input.userId))
          .run();

        tx.update(emojis)
          .set({ userId: deletedUserId })
          .where(eq(emojis.userId, input.userId))
          .run();

        // the reactions primary key is (messageId, userId, emoji), so a
        // reaction the placeholder already holds cannot be reassigned onto it
        // and has to go instead, or the whole delete fails on the constraint
        tx.delete(messageReactions)
          .where(
            and(
              eq(messageReactions.userId, input.userId),
              exists(
                tx
                  .select({ one: sql`1` })
                  .from(placeholderReactions)
                  .where(
                    and(
                      eq(placeholderReactions.userId, deletedUserId),
                      eq(
                        placeholderReactions.messageId,
                        messageReactions.messageId
                      ),
                      eq(placeholderReactions.emoji, messageReactions.emoji)
                    )
                  )
              )
            )
          )
          .run();

        tx.update(messageReactions)
          .set({ userId: deletedUserId })
          .where(eq(messageReactions.userId, input.userId))
          .run();

        tx.update(files)
          .set({ userId: deletedUserId })
          .where(eq(files.userId, input.userId))
          .run();
      } else {
        // cascade will handle deleting all related data
      }

      tx.delete(users).where(eq(users.id, input.userId)).run();
    });

    pubsub.publish(ServerEvents.USER_DELETE, {
      isWipe: input.wipe,
      userId: input.userId,
      deletedUserId
    });

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
