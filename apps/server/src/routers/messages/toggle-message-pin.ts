import { z } from 'zod';
import { loadMessageForWrite } from '../../helpers/load-message-for-write';
import { setMessagePinned } from '../../helpers/message-pin';
import { protectedProcedure } from '../../utils/trpc';

const toggleMessagePinRoute = protectedProcedure
  .input(z.object({ messageId: z.number() }))
  .mutation(async ({ ctx, input }) => {
    const message = await loadMessageForWrite(ctx, input.messageId);

    await setMessagePinned(message, !message.pinned, ctx.user.id);
  });

export { toggleMessagePinRoute };
