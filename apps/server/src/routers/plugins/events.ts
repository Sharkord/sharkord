import { ServerEvents } from '@sharkord/shared';
import { protectedProcedure } from '../../utils/trpc';

const onPluginLogRoute = protectedProcedure.subscription(async ({ ctx }) => {
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

export { onCommandsChangeRoute, onComponentsChangeRoute, onPluginLogRoute };
