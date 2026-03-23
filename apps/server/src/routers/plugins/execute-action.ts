import { Permission } from '@sharkord/shared';
import z from 'zod';
import { getInvokerCtxFromTrpcCtx } from '../../helpers/get-invoker-ctx-from-trpc-ctx';
import { pluginManager } from '../../plugins';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const executeActionRoute = protectedProcedure
  .input(
    z.object({
      pluginId: z.string(),
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

    const response = await pluginManager.executeAction(
      input.pluginId,
      input.actionName,
      getInvokerCtxFromTrpcCtx(ctx),
      input.payload
    );

    return response;
  });

export { executeActionRoute };
