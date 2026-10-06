import { Permission, REACTION_EMOJI_MAX_LENGTH } from '@sharkord/shared';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { config } from '../../config';
import { db } from '../../db';
import { publishMessage } from '../../db/publishers';
import { getReaction } from '../../db/queries/messages';
import { messageReactions } from '../../db/schema';
import { loadMessageForWrite } from '../../helpers/load-message-for-write';
import { resolveKnownEmojiFileId } from '../../helpers/resolve-known-emoji-file-id';
import { eventBus } from '../../plugins/event-bus';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

const toggleMessageReactionRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.toggleMessageReaction.maxRequests,
  windowMs: config.rateLimiters.toggleMessageReaction.windowMs,
  logLabel: 'toggleMessageReaction'
})
  .input(
    z.object({
      messageId: z.number(),
      emoji: z.string().min(1).max(REACTION_EMOJI_MAX_LENGTH)
    })
  )
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.REACT_TO_MESSAGES);

    const message = await loadMessageForWrite(ctx, input.messageId);

    const reaction = await getReaction(
      input.messageId,
      input.emoji,
      ctx.user.id
    );

    if (!reaction) {
      const emojiFileId = await resolveKnownEmojiFileId(input.emoji);

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

    publishMessage(input.messageId, message.channelId, 'update');

    eventBus.emit(reaction ? 'reaction:removed' : 'reaction:added', {
      messageId: input.messageId,
      channelId: message.channelId,
      userId: ctx.user.id,
      emoji: input.emoji
    });
  });

export { toggleMessageReactionRoute };
