import { ServerEvents } from '@sharkord/shared';
import { protectedProcedure } from '../../utils/trpc';

const onChannelCreateRoute = protectedProcedure.subscription(
  async ({ ctx }) => {
    return ctx.pubsub.subscribe(ServerEvents.CHANNEL_CREATE);
  }
);

const onChannelDeleteRoute = protectedProcedure.subscription(
  async ({ ctx }) => {
    return ctx.pubsub.subscribe(ServerEvents.CHANNEL_DELETE);
  }
);

const onChannelUpdateRoute = protectedProcedure.subscription(
  async ({ ctx }) => {
    return ctx.pubsub.subscribe(ServerEvents.CHANNEL_UPDATE);
  }
);

const onChannelPermissionsUpdateRoute = protectedProcedure.subscription(
  async ({ ctx }) => {
    return ctx.pubsub.subscribeFor(
      ctx.userId,
      ServerEvents.CHANNEL_PERMISSIONS_UPDATE
    );
  }
);

const onChannelReadStatesUpdateRoute = protectedProcedure.subscription(
  async ({ ctx }) => {
    return ctx.pubsub.subscribeFor(
      ctx.userId,
      ServerEvents.CHANNEL_READ_STATES_UPDATE
    );
  }
);

const onChannelReadStatesDeltaRoute = protectedProcedure.subscription(
  async ({ ctx }) => {
    return ctx.pubsub.subscribeFor(
      ctx.userId,
      ServerEvents.CHANNEL_READ_STATES_DELTA
    );
  }
);

export {
  onChannelCreateRoute,
  onChannelDeleteRoute,
  onChannelPermissionsUpdateRoute,
  onChannelReadStatesDeltaRoute,
  onChannelReadStatesUpdateRoute,
  onChannelUpdateRoute
};
