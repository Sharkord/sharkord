import z from 'zod';
import { removeFile } from '../../db/mutations/files';
import { updateSettings } from '../../db/mutations/server';
import { publishSettings } from '../../db/publishers';
import { getSettings } from '../../db/queries/server';
import { fileManager } from '../../utils/file-manager';
import { protectedProcedure } from '../../utils/trpc';

const changeLogoRoute = protectedProcedure
  .input(
    z.object({
      fileId: z.string().optional()
    })
  )
  .mutation(async ({ ctx, input }) => {
    const settings = await getSettings();

    if (settings.logoId) {
      await removeFile(settings.logoId);
      await updateSettings({ logoId: null });
    }

    if (input.fileId) {
      const newFile = await fileManager.saveFile(input.fileId, ctx.userId);

      await updateSettings({ logoId: newFile.id });
    }

    await publishSettings();
  });

export { changeLogoRoute };
