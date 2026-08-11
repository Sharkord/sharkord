import { FileSaveType } from '@sharkord/shared';
import z from 'zod';
import { removeFile } from '../../db/mutations/files';
import { updateSettings } from '../../db/mutations/server';
import { publishSettings } from '../../db/publishers';
import { getSettings } from '../../db/queries/server';
import { saveReplacementImage } from '../../helpers/change-user-image';
import { protectedProcedure } from '../../utils/trpc';

const changeLogoRoute = protectedProcedure
  .input(
    z.object({
      fileId: z.string().optional()
    })
  )
  .mutation(async ({ ctx, input }) => {
    const settings = await getSettings();
    const previousLogoId = settings.logoId;

    const nextLogoId = await saveReplacementImage(
      ctx.userId,
      FileSaveType.SERVER_LOGO,
      input.fileId
    );

    await updateSettings({ logoId: nextLogoId });

    if (previousLogoId) {
      await removeFile(previousLogoId);
    }

    publishSettings();
  });

export { changeLogoRoute };
