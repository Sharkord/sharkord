import { Permission } from '@sharkord/shared';
import z from 'zod';
import { pluginManager } from '../../plugins';
import { protectedProcedure } from '../../utils/trpc';

const getCommandsRoute = protectedProcedure
  .input(
    z.object({
      pluginId: z.string().optional()
    })
  )
  .query(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.MANAGE_PLUGINS);

    const allCommands = pluginManager.getCommands();

    if (input.pluginId) {
      const pluginCommands = allCommands[input.pluginId];

      return pluginCommands ? { [input.pluginId]: pluginCommands } : {};
    }

    return allCommands;
  });

export { getCommandsRoute };
