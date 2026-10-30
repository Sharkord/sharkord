import {
  ActivityLogType,
  DELETED_USER_IDENTITY_AND_NAME,
  ServerEvents
} from '@sharkord/shared';
import { and, eq, exists, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { db } from '../db';
import { publishUser } from '../db/publishers';
import { getUserByIdentity } from '../db/queries/users';
import { emojis, files, messageReactions, messages, users } from '../db/schema';
import { eventBus } from '../plugins/event-bus';
import { enqueueActivityLog } from '../queues/activity-log';
import { pubsub } from '../utils/pubsub';

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

// removes an account, an admin's delete and someone deleting their own go through the same
// steps. without wipe their messages, reactions and uploads move to the deleted user placeholder
const deleteUserAccount = async (
  userId: number,
  { wipe, deletedBy }: { wipe: boolean; deletedBy: number }
) => {
  const deletedUserId = await ensureDeletedUser();

  db.transaction((tx) => {
    if (!wipe) {
      // Reassign everything to deleted user placeholder

      tx.update(messages)
        .set({ userId: deletedUserId })
        .where(eq(messages.userId, userId))
        .run();

      tx.update(emojis)
        .set({ userId: deletedUserId })
        .where(eq(emojis.userId, userId))
        .run();

      // the reactions primary key is (messageId, userId, emoji), so a
      // reaction the placeholder already holds cannot be reassigned onto it
      // and has to go instead, or the whole delete fails on the constraint
      tx.delete(messageReactions)
        .where(
          and(
            eq(messageReactions.userId, userId),
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
        .where(eq(messageReactions.userId, userId))
        .run();

      tx.update(files)
        .set({ userId: deletedUserId })
        .where(eq(files.userId, userId))
        .run();
    } else {
      // cascade will handle deleting all related data
    }

    tx.delete(users).where(eq(users.id, userId)).run();
  });

  pubsub.publish(ServerEvents.USER_DELETE, {
    isWipe: wipe,
    userId: userId,
    deletedUserId
  });

  eventBus.emit('user:deleted', { userId: userId });

  enqueueActivityLog({
    type: ActivityLogType.USER_DELETED,
    userId,
    details: {
      reason: 'Your account has been deleted',
      deletedBy
    }
  });
};

export { deleteUserAccount };
