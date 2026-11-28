import { z } from 'zod';
import { db } from '../../db';
import { publishMessage } from '../../db/publishers';
import { getViewOnceFileMessage } from '../../db/queries/files';
import { fileViews } from '../../db/schema';
import { assertChannelAccess } from '../../helpers/assert-channel-access';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const openViewOnceRoute = protectedProcedure
  .input(z.object({ fileId: z.number().int().positive() }))
  .mutation(async ({ ctx, input }) => {
    const message = await getViewOnceFileMessage(input.fileId);

    invariant(message, {
      code: 'NOT_FOUND',
      message: 'File not found.'
    });

    await assertChannelAccess(ctx, message.channelId);

    invariant(message.userId !== ctx.userId, {
      code: 'FORBIDDEN',
      message: 'You cannot open your own view once file.'
    });

    // the primary key makes a second open a no-op, so two racing requests cannot both get in
    const view = await db
      .insert(fileViews)
      .values({
        fileId: input.fileId,
        userId: ctx.userId,
        createdAt: Date.now()
      })
      .onConflictDoNothing()
      .returning({ fileId: fileViews.fileId })
      .get();

    invariant(view, {
      code: 'CONFLICT',
      message: 'You have already opened this file.'
    });

    await publishMessage(message.messageId, message.channelId, 'update');
  });

export { openViewOnceRoute };
