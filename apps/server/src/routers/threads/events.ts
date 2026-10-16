import { ServerEvents } from '@sharkord/shared';
import { protectedProcedure } from '../../utils/trpc';

const onThreadFollowUpdateRoute = protectedProcedure.subscription(
  async ({ ctx }) => {
    return ctx.pubsub.subscribeFor(
      ctx.userId,
      ServerEvents.THREAD_FOLLOW_UPDATE
    );
  }
);

export { onThreadFollowUpdateRoute };
