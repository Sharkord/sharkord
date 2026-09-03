import { Permission, ServerEvents } from '@sharkord/shared';
import { protectedProcedure } from '../../utils/trpc';

const onPluginLogRoute = protectedProcedure.subscription(async ({ ctx }) => {
  await ctx.needsPermission(Permission.MANAGE_PLUGINS);

  return ctx.pubsub.subscribe(ServerEvents.PLUGIN_LOG);
});

const onCommandsChangeRoute = protectedProcedure.subscription(
  async ({ ctx }) => {
    return ctx.pubsub.subscribe(ServerEvents.PLUGIN_COMMANDS_CHANGE);
  }
);

const onComponentsChangeRoute = protectedProcedure.subscription(
  async ({ ctx }) => {
    return ctx.pubsub.subscribe(ServerEvents.PLUGIN_COMPONENTS_CHANGE);
  }
);

const onCapabilityAccessChangeRoute = protectedProcedure.subscription(
  async ({ ctx }) => {
    return ctx.pubsub.subscribe(ServerEvents.PLUGIN_CAPABILITY_ACCESS_CHANGE);
  }
);

const onMetadataChangeRoute = protectedProcedure.subscription(
  async ({ ctx }) => {
    return ctx.pubsub.subscribe(ServerEvents.PLUGIN_METADATA_CHANGE);
  }
);

const onPushRoute = protectedProcedure.subscription(async ({ ctx }) => {
  return ctx.pubsub.subscribeFor(ctx.user.id, ServerEvents.PLUGIN_PUSH);
});

export {
  onCapabilityAccessChangeRoute,
  onCommandsChangeRoute,
  onComponentsChangeRoute,
  onMetadataChangeRoute,
  onPluginLogRoute,
  onPushRoute
};
