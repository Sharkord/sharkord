import { ActivityLogType, Permission, zPluginId } from '@sharkord/shared';
import z from 'zod';
import { getInvokerCtxFromTrpcCtx } from '../../helpers/get-invoker-ctx-from-trpc-ctx';
import { pluginManager } from '../../plugins';
import { enqueueActivityLog } from '../../queues/activity-log';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const executeActionRoute = protectedProcedure
  .input(
    z.object({
      pluginId: zPluginId,
      actionName: z.string(),
      payload: z.unknown().optional()
    })
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.USE_PLUGINS);

    invariant(pluginManager.hasAction(input.pluginId, input.actionName), {
      code: 'BAD_REQUEST',
      message: `Action "${input.actionName}" not found for plugin "${input.pluginId}"`
    });

    enqueueActivityLog({
      type: ActivityLogType.EXECUTED_PLUGIN_ACTION,
      userId: ctx.user.id,
      details: {
        pluginId: input.pluginId,
        actionName: input.actionName,
        payload: input.payload
      }
    });

    const response = await pluginManager.executeAction(
      input.pluginId,
      input.actionName,
      getInvokerCtxFromTrpcCtx(ctx),
      input.payload
    );

    return response;
  });

export { executeActionRoute };
