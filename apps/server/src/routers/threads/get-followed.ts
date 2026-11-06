import { zMessagesCursor } from '@sharkord/shared';
import { z } from 'zod';
import { getChannelsForUser } from '../../db/queries/channels';
import { getFollowedThreadsPage } from '../../db/queries/threads';
import { protectedProcedure } from '../../utils/trpc';

const FOLLOWED_THREADS_LIMIT = 200; // just a safeguard

const getFollowedThreadsRoute = protectedProcedure
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
