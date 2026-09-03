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

const executeCommandRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.pluginExecute.maxRequests,
  windowMs: config.rateLimiters.pluginExecute.windowMs,
  logLabel: 'executeCommand'
})
  .input(
    z.object({
      pluginId: zPluginId,
      commandName: z.string(),
      args: z.record(z.string(), z.any()).optional(),
      channelId: z.number().optional()
    })
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.USE_PLUGINS);

    invariant(
      await canUseCapability(
        ctx.user.id,
        input.pluginId,
        PluginCapabilityType.COMMAND,
        input.commandName
      ),
      {
        code: 'FORBIDDEN',
        message: `You do not have access to this command.`
      }
    );

    invariant(pluginManager.hasCommand(input.pluginId, input.commandName), {
      code: 'BAD_REQUEST',
      message: `Command "${input.commandName}" not found for plugin "${input.pluginId}"`
    });

    if (input.channelId) await assertChannelAccess(ctx, input.channelId);

    try {
      const response = await pluginManager.executeCommand(
        input.pluginId,
        input.commandName,
        getInvokerCtxFromTrpcCtx(ctx, {
          source: 'api',
          channelId: input.channelId
        }),
        input.args ?? {}
      );

      return response;
    } finally {
      enqueueActivityLog({
        type: ActivityLogType.EXECUTED_PLUGIN_COMMAND,
        userId: ctx.user.id,
        details: {
          pluginId: input.pluginId,
          commandName: input.commandName,
          args: input.args ?? {}
        }
      });
    }
  });

export { executeCommandRoute };
