import {
  ActivityLogType,
  Permission,
  PluginCapabilityType,
  zPluginId
} from '@sharkord/shared';
import z from 'zod';
import { config } from '../../config';
import { assertChannelAccess } from '../../helpers/assert-channel-access';
import { getInvokerCtxFromTrpcCtx } from '../../helpers/get-invoker-ctx-from-trpc-ctx';
import { canUseCapability } from '../../helpers/plugin-capability-access';
import { pluginManager } from '../../plugins';
import { enqueueActivityLog } from '../../queues/activity-log';
import { invariant } from '../../utils/invariant';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

const executeActionRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.pluginExecute.maxRequests,
  windowMs: config.rateLimiters.pluginExecute.windowMs,
  logLabel: 'executeAction'
})
  .input(
    z.object({
      pluginId: zPluginId,
      actionName: z.string(),
      payload: z.unknown().optional(),
      channelId: z.number().optional()
    })
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.USE_PLUGINS);

    invariant(
      await canUseCapability(
        ctx.user.id,
        input.pluginId,
        PluginCapabilityType.ACTION,
        input.actionName
      ),
      {
        code: 'FORBIDDEN',
        message: `You do not have access to this action.`
      }
    );

    invariant(pluginManager.hasAction(input.pluginId, input.actionName), {
      code: 'BAD_REQUEST',
      message: `Action "${input.actionName}" not found for plugin "${input.pluginId}"`
    });

    if (input.channelId) await assertChannelAccess(ctx, input.channelId);

    try {
      const response = await pluginManager.executeAction(
        input.pluginId,
        input.actionName,
        getInvokerCtxFromTrpcCtx(ctx, {
          source: 'api',
          channelId: input.channelId
        }),
        input.payload
      );

      return response;
    } finally {
      enqueueActivityLog({
        type: ActivityLogType.EXECUTED_PLUGIN_ACTION,
        userId: ctx.user.id,
        details: {
          pluginId: input.pluginId,
          actionName: input.actionName,
          payload: input.payload
        }
      });
    }
  });

export { executeActionRoute };
