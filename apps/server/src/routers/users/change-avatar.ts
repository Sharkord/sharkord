import { Permission } from '@sharkord/shared';
import z from 'zod';
import { changeUserImage } from '../../helpers/change-user-image';
import { protectedProcedure } from '../../utils/trpc';

const changeAvatarRoute = protectedProcedure
  .input(
    z.object({
      fileId: z.string().optional()
    })
  )
  .mutation(async ({ ctx, input }) => {
    // removing an avatar stays open to everyone, so a user whose role lost the
    // permission can still clear an image they no longer want to show
    if (input.fileId) {
      await ctx.needsPermission(Permission.SET_PROFILE_IMAGE);
    }

    await changeUserImage(ctx.userId, 'avatar', input.fileId);
  });

export { changeAvatarRoute };
