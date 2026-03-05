import { ServerEvents } from '@sharkord/shared';
import { protectedProcedure } from '../../utils/trpc';

const onUserJoinRoute = protectedProcedure.subscription(async ({ ctx }) => {
  return ctx.pubsub.subscribe(ServerEvents.USER_JOIN);
});

const onUserLeaveRoute = protectedProcedure.subscription(async ({ ctx }) => {
  return ctx.pubsub.subscribe(ServerEvents.USER_LEAVE);
});

const onUserUpdateRoute = protectedProcedure.subscription(async ({ ctx }) => {
  return ctx.pubsub.subscribe(ServerEvents.USER_UPDATE);
});

const onUserCreateRoute = protectedProcedure.subscription(async ({ ctx }) => {
  return ctx.pubsub.subscribe(ServerEvents.USER_CREATE);
});

const onUserDeleteRoute = protectedProcedure.subscription(async ({ ctx }) => {
  return ctx.pubsub.subscribe(ServerEvents.USER_DELETE);
});

export {
  onUserCreateRoute,
  onUserDeleteRoute,
  onUserJoinRoute,
  onUserLeaveRoute,
  onUserUpdateRoute
};
