import { eq } from 'drizzle-orm';
import z from 'zod';
import { db } from '../../db';
import { removeFile } from '../../db/mutations/files';
import { publishUser } from '../../db/publishers';
import { getUserById } from '../../db/queries/users';
import { users } from '../../db/schema';
import { fileManager } from '../../utils/file-manager';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const changeBannerRoute = protectedProcedure
  .input(
    z.object({
      fileId: z.string().optional()
    })
  )
  .mutation(async ({ ctx, input }) => {
    const user = await getUserById(ctx.userId);

    invariant(user, {
      code: 'NOT_FOUND',
      message: 'User not found'
    });

    if (user.bannerId) {
      await removeFile(user.bannerId);

      await db
        .update(users)
        .set({ bannerId: null })
        .where(eq(users.id, ctx.userId));
    }

    if (input.fileId) {
      const tempFile = await fileManager.getTemporaryFile(input.fileId);

      invariant(tempFile, {
        code: 'NOT_FOUND',
        message: 'Temporary file not found'
      });

      invariant(tempFile.size <= 3 * 1024 * 1024, {
        code: 'BAD_REQUEST',
        message: 'File size exceeds the limit of 3 MB'
      });

      const newFile = await fileManager.saveFile(input.fileId, ctx.userId);

      await db
        .update(users)
        .set({ bannerId: newFile.id })
        .where(eq(users.id, ctx.userId));
    }

    publishUser(ctx.userId, 'update');
  });

export { changeBannerRoute };
