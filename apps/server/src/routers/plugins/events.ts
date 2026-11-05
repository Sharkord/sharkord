import {
  getErrorMessage,
  Permission,
  ServerEvents,
  type TLogEntry
} from '@sharkord/shared';
import { observable } from '@trpc/server/observable';
import { logger } from '../../logger';
import { protectedProcedure } from '../../utils/trpc';

const onPluginLogRoute = protectedProcedure.subscription(async ({ ctx }) => {
  await ctx.needsPermission(Permission.MANAGE_PLUGINS);

  return observable<TLogEntry>((observer) => {
    let pending = Promise.resolve();
    let closed = false;

    const subscription = ctx.pubsub
      .subscribe(ServerEvents.PLUGIN_LOG)
      .subscribe({
        next: (entry) => {
          pending = pending.then(async () => {
            if (closed) return;

            let allowed = false;

            try {
              allowed = await ctx.hasPermission(Permission.MANAGE_PLUGINS);
            } catch (error) {
              logger.error(
                'Failed to check plugin log access: %s',
                getErrorMessage(error)
              );
            }

            if (allowed) {
              observer.next(entry);

              return;
            }

            closed = true;

            subscription.unsubscribe();
            observer.complete();
          });
        }
      });

    return () => {
      closed = true;

      subscription.unsubscribe();
    };
  });
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

const onEphemeralResponseRoute = protectedProcedure.subscription(
  async ({ ctx }) => {
    return ctx.pubsub.subscribeFor(
      ctx.user.id,
      ServerEvents.PLUGIN_EPHEMERAL_RESPONSE
    );
  }
);

export {
  onCapabilityAccessChangeRoute,
  onCommandsChangeRoute,
  onComponentsChangeRoute,
  onEphemeralResponseRoute,
  onMetadataChangeRoute,
  onPluginLogRoute,
  onPushRoute
};
