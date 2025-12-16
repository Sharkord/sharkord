import { Permission } from '@sharkord/shared';
import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { channels } from '../../db/schema';
import { protectedProcedure } from '../../utils/trpc';

const getChannelRoute = protectedProcedure
  .input(
    z.object({
      channelId: z.number().min(1)
    })
  )
  .query(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.MANAGE_CHANNELS);

    const channel = await db
      .select()
      .from(channels)
      .where(eq(channels.id, input.channelId))
      .get();

    if (!channel) {
      throw new TRPCError({
        code: 'NOT_FOUND'
      });
    }

    return channel;
  });

export { getChannelRoute };
