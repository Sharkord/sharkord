import { ActivityLogType, type TEmoji } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { removeFile } from '../db/mutations/files';
import { publishEmoji } from '../db/publishers';
import { emojis } from '../db/schema';
import { eventBus } from '../plugins/event-bus';
import { enqueueActivityLog } from '../queues/activity-log';
import { invariant } from '../utils/invariant';

type TPreparedEmoji = {
  name: string;
  fileId: number;
};

const insertEmojis = (
  prepared: TPreparedEmoji[],
  userId: number, // is who the emoji is attributed to
  actorUserId: number | null // is who added the emoji, used by plugins on behalf of a user
): TEmoji[] => {
  const createdEmojis = db.transaction((tx) =>
    tx
      .insert(emojis)
      .values(
        prepared.map(({ name, fileId }) => ({
          name,
          fileId,
          userId,
          createdAt: Date.now()
        }))
      )
      .returning()
      .all()
  );

  for (const emoji of createdEmojis) {
    publishEmoji(emoji.id, 'create');
    eventBus.emit('emoji:created', {
      emojiId: emoji.id,
      name: emoji.name,
      userId
    });
    enqueueActivityLog({
      type: ActivityLogType.CREATED_EMOJI,
      userId: actorUserId,
      details: {
        name: emoji.name
      }
    });
  }

  return createdEmojis;
};

const deleteEmoji = async (emojiId: number, actorUserId: number | null) => {
  const removedEmoji = await db
    .delete(emojis)
    .where(eq(emojis.id, emojiId))
    .returning()
    .get();

  invariant(removedEmoji, {
    code: 'NOT_FOUND',
    message: 'Emoji not found'
  });

  await removeFile(removedEmoji.fileId);

  publishEmoji(removedEmoji.id, 'delete');
  enqueueActivityLog({
    type: ActivityLogType.DELETED_EMOJI,
    userId: actorUserId,
    details: {
      name: removedEmoji.name
    }
  });
};

export { deleteEmoji, insertEmojis };
export type { TPreparedEmoji };
