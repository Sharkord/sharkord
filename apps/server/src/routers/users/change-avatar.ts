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
    await changeUserImage(ctx.userId, 'avatar', input.fileId);
  });

export { changeAvatarRoute };
