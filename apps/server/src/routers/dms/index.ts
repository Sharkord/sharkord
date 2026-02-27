import { ServerEvents } from '@sharkord/shared';
import { protectedProcedure, t } from '../../utils/trpc';
import { getDirectMessagesRoute } from './get-direct-messages';
import { openDirectMessageRoute } from './open-direct-message';

const onDmConversationOpenRoute = protectedProcedure.subscription(
  async ({ ctx }) => {
    return ctx.pubsub.subscribeFor(ctx.userId, ServerEvents.DM_CONVERSATION_OPEN);
  }
);

export const dmsRouter = t.router({
  get: getDirectMessagesRoute,
  open: openDirectMessageRoute,
  onConversationOpen: onDmConversationOpenRoute
});
