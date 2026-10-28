import { Permission } from '@sharkord/shared';
import z from 'zod';
import { changeUserImage } from '../../helpers/change-user-image';
import { protectedProcedure } from '../../utils/trpc';

const changeBannerRoute = protectedProcedure
  .input(
    z.object({
      fileId: z.string().optional()
    })
  )
  .mutation(async ({ ctx, input }) => {
    // removing a banner stays open to everyone, same as the avatar route
    if (input.fileId) {
      await ctx.needsPermission(Permission.SET_PROFILE_IMAGE);
    }

    await changeUserImage(ctx.userId, 'banner', input.fileId);
  });

export { changeBannerRoute };
