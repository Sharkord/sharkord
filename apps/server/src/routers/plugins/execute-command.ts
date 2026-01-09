import { ActivityLogType, Permission } from '@sharkord/shared';
import z from 'zod';
import { pluginManager } from '../../plugins';
import { enqueueActivityLog } from '../../queues/activity-log';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const executeCommandRoute = protectedProcedure
  .input(
    z.object({
      pluginId: z.string(),
      commandName: z.string(),
      args: z.record(z.string(), z.any()).optional()
    })
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.MANAGE_PLUGINS);

    console.log('Executing command', input);

    invariant(pluginManager.hasCommand(input.pluginId, input.commandName), {
      code: 'BAD_REQUEST',
      message: `Command "${input.commandName}" not found for plugin "${input.pluginId}"`
    });

    enqueueActivityLog({
      type: ActivityLogType.EXECUTED_PLUGIN_COMMAND,
      userId: ctx.user.id,
      details: {
        pluginId: input.pluginId,
        commandName: input.commandName,
        args: input.args ?? {}
      }
    });

    const response = await pluginManager.executeCommand(
      input.pluginId,
      input.commandName,
      input.args ?? {}
    );

    return response;
  });

export { executeCommandRoute };
