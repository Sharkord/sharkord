import { Permission } from '@sharkord/shared';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { publishMessage, publishExternalMessage } from '../../db/publishers';
import { getEmojiFileIdByEmojiName } from '../../db/queries/emojis';
import { getReaction } from '../../db/queries/messages';
import { messageReactions, messages } from '../../db/schema';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const toggleMessageReactionRoute = protectedProcedure
  .input(
    z.object({
      messageId: z.number(),
      emoji: z.string()
    })
  )
  .mutation(async ({ input, ctx }) => {

    const message = await db
      .select()
      .from(messages)
      .where(eq(messages.id, input.messageId))
      .get();

    invariant(message, {
      code: 'NOT_FOUND',
      message: 'Message not found'
    });

    if( message.channelId  ) {
      await ctx.needsPermission(Permission.REACT_TO_MESSAGES);
    }

    const reaction = await getReaction(
      input.messageId,
      input.emoji,
      ctx.user.id
    );

    if (!reaction) {
      const emojiFileId = await getEmojiFileIdByEmojiName(input.emoji);

      await db.insert(messageReactions).values({
        messageId: input.messageId,
        emoji: input.emoji,
        userId: ctx.user.id,
        fileId: emojiFileId,
        createdAt: Date.now()
      });
    } else {
      await db
        .delete(messageReactions)
        .where(
          and(
            eq(messageReactions.messageId, input.messageId),
            eq(messageReactions.emoji, input.emoji),
            eq(messageReactions.userId, ctx.user.id)
          )
        );
    }

    if( message.externalChannelId ) {
      publishExternalMessage(message.id, message.externalChannelId, 'update');
    }
    else {
      publishMessage(message.id, message.channelId, 'update');
    }

  });

export { toggleMessageReactionRoute };
 