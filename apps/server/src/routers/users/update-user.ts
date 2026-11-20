import { z } from 'zod';
import {
  updateUserProfile,
  zBio,
  zName,
  zProfileColor
} from '../../helpers/update-user-profile';
import { protectedProcedure } from '../../utils/trpc';

const updateUserRoute = protectedProcedure
  .input(
    z.object({
      name: zName,
      profileColor: zProfileColor,
      bio: zBio.optional()
    })
  )
  .mutation(async ({ ctx, input }) => {
    await updateUserProfile(ctx.userId, {
      ...input,
      bio: input.bio ?? null
    });
  });

export { updateUserRoute };
