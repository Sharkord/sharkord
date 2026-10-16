import { ServerEvents } from '@sharkord/shared';
import { protectedProcedure, t } from '../../utils/trpc';
import { closeDirectMessageRoute } from './close-direct-message';
import { openDirectMessageRoute } from './open-direct-message';

const onDmConversationUpdateRoute = protectedProcedure.subscription(
  async ({ ctx }) => {
    return ctx.pubsub.subscribeFor(
      ctx.userId,
      ServerEvents.DM_CONVERSATION_UPDATE
    );
  }
);

export const dmsRouter = t.router({
  open: openDirectMessageRoute,
  close: closeDirectMessageRoute,
  onConversationUpdate: onDmConversationUpdateRoute
});
