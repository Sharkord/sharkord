import { ChannelPermission } from '@sharkord/shared';
import { z } from 'zod';
import { config } from '../../config';
import { protectedProcedure } from '../../utils/trpc';

const getWhipIngestInfoRoute = protectedProcedure
  .input(
    z.object({
      channelId: z.number().int().positive()
    })
  )
  .query(async ({ input, ctx }) => {
    await ctx.needsChannelPermission(
      input.channelId,
      ChannelPermission.SHARE_SCREEN
    );

    // user tokens always work for logged-in members; the global key is
    // optional and only needed for external encoders such as OBS
    const enabled = config.whip.enabled;

    return {
      enabled,
      path: `/whip/${input.channelId}`,
      key: enabled && config.whip.key ? config.whip.key : null
    };
  });

export { getWhipIngestInfoRoute };
