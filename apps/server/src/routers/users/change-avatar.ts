import { eq } from 'drizzle-orm';
import z from 'zod';
import { db } from '../../db';
import { removeFile } from '../../db/mutations/files';
import { publishUser } from '../../db/publishers';
import { getSettings } from '../../db/queries/server';
import { getUserById } from '../../db/queries/users';
import { users } from '../../db/schema';
import { fileManager } from '../../utils/file-manager';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const changeAvatarRoute = protectedProcedure
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

    if (user.avatarId) {
      await removeFile(user.avatarId);

      await db
        .update(users)
        .set({ avatarId: null })
        .where(eq(users.id, ctx.userId))
        .run();
    }

    if (input.fileId) {
      const tempFile = await fileManager.getTemporaryFile(input.fileId);

      invariant(tempFile, {
        code: 'NOT_FOUND',
        message: 'Temporary file not found'
      });

      const settings = await getSettings();

      invariant(tempFile.size <= settings.storageMaxAvatarSize, {
        code: 'BAD_REQUEST',
        message: `Avatar file exceeds the configured maximum size of ${settings.storageMaxAvatarSize / (1024 * 1024)} MB`
      });

      const newFile = await fileManager.saveFile(input.fileId, ctx.userId);

      await db
        .update(users)
        .set({ avatarId: newFile.id })
        .where(eq(users.id, ctx.userId))
        .run();
    }

    publishUser(ctx.userId, 'update');
  });

export { changeAvatarRoute };
