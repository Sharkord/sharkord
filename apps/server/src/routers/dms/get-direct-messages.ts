import { z } from 'zod';
import { getDirectMessageConversations } from '../../db/queries/dms';
import { getSettings } from '../../db/queries/server';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const getDirectMessagesRoute = protectedProcedure
  .input(z.void())
  .query(async ({ ctx }) => {
    const settings = await getSettings();

    invariant(settings.directMessagesEnabled, {
      code: 'FORBIDDEN',
      message: 'Direct messages are disabled on this server'
    });

    return getDirectMessageConversations(ctx.userId);
  });

export { getDirectMessagesRoute };
