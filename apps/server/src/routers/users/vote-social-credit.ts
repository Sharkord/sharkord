import { and, eq, gte, sql } from 'drizzle-orm';
import z from 'zod';
import { db } from '../../db';
import { publishUser } from '../../db/publishers';
import { socialCreditVotes, users } from '../../db/schema';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const UPVOTE_VALUE = 10;
const DOWNVOTE_VALUE = -5;

const getStartOfDay = () => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.getTime();
};

const voteSocialCreditRoute = protectedProcedure
  .input(
    z.object({
      targetUserId: z.number(),
      type: z.enum(['upvote', 'downvote'])
    })
  )
  .mutation(async ({ ctx, input }) => {
    invariant(input.targetUserId !== ctx.user.id, {
      code: 'BAD_REQUEST',
      message: 'You cannot vote for yourself.'
    });

    const targetUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, input.targetUserId))
      .get();

    invariant(targetUser, {
      code: 'NOT_FOUND',
      message: 'User not found.'
    });

    const startOfDay = getStartOfDay();

    const existingVote = await db
      .select({ id: socialCreditVotes.id })
      .from(socialCreditVotes)
      .where(
        and(
          eq(socialCreditVotes.voterId, ctx.user.id),
          eq(socialCreditVotes.targetId, input.targetUserId),
          gte(socialCreditVotes.createdAt, startOfDay)
        )
      )
      .get();

    invariant(!existingVote, {
      code: 'BAD_REQUEST',
      message: 'You have already voted for this user today.'
    });

    const value = input.type === 'upvote' ? UPVOTE_VALUE : DOWNVOTE_VALUE;

    await db.insert(socialCreditVotes).values({
      voterId: ctx.user.id,
      targetId: input.targetUserId,
      value,
      createdAt: Date.now()
    });

    await db
      .update(users)
      .set({
        socialCredit: sql`${users.socialCredit} + ${value}`
      })
      .where(eq(users.id, input.targetUserId));

    publishUser(input.targetUserId, 'update');
  });

export { voteSocialCreditRoute };
