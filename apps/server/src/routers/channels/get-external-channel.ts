import { Permission } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { externalChannels } from '../../db/schema';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const getExternalChannelRoute = protectedProcedure
  .input(
    z.object({
      channelId: z.number().min(1)
    })
  )
  .query(async ({ input, ctx }) => {

    const externalChannel = await db
      .select()
      .from(externalChannels)
      .where(eq(externalChannels.id, input.channelId))
      .get();

    invariant(externalChannel, {
      code: 'NOT_FOUND',
      message: 'Channel not found'
    });

    return externalChannel;
  });

export { getExternalChannelRoute };
