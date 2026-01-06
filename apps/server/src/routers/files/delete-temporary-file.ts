import { z } from 'zod';
import { fileManager } from '../../utils/file-manager.js';
import { invariant } from '../../utils/invariant.js';
import { protectedProcedure } from '../../utils/trpc.js';

const deleteTemporaryFileRoute = protectedProcedure
  .input(z.object({ fileId: z.string() }))
  .mutation(async ({ input, ctx }) => {
    const temporaryFile = fileManager.getTemporaryFile(input.fileId);

    invariant(temporaryFile, {
      code: 'NOT_FOUND',
      message: 'Temporary file not found'
    });

    const isOwnUserFile = temporaryFile.userId === ctx.user.id;

    invariant(isOwnUserFile, {
      code: 'FORBIDDEN',
      message: 'You do not have permission to delete this temporary file'
    });

    await fileManager.removeTemporaryFile(input.fileId);
  });

export { deleteTemporaryFileRoute };
