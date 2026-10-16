import { zMessagesCursor } from '@sharkord/shared';
import { z } from 'zod';
import { config } from '../../config';
import { getChannelsForUser } from '../../db/queries/channels';
import { getFollowedThreadsPage } from '../../db/queries/threads';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

const FOLLOWED_THREADS_LIMIT = 200; // just a safeguard

const getFollowedThreadsRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.getMessages.maxRequests,
  windowMs: config.rateLimiters.getMessages.windowMs,
  logLabel: 'getFollowedThreads'
})
  .input(
    z.object({
      cursor: zMessagesCursor.nullish(),
      limit: z
        .number()
        .int()
        .min(1)
        .max(FOLLOWED_THREADS_LIMIT)
        .default(FOLLOWED_THREADS_LIMIT)
    })
  )
  .query(async ({ ctx, input }) => {
    const channels = await getChannelsForUser(ctx.userId);

    return getFollowedThreadsPage(
      ctx.userId,
      channels.map(({ id }) => id),
      input.cursor,
      input.limit
    );
  });

export { getFollowedThreadsRoute };
