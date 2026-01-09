import { Permission } from '@sharkord/shared';
import z from 'zod';
import { pluginManager } from '../../plugins';
import { protectedProcedure } from '../../utils/trpc';

const getCommandsRoute = protectedProcedure
  .input(
    z.object({
      pluginId: z.string()
    })
  )
  .query(async ({ ctx }) => {
    await ctx.needsPermission(Permission.MANAGE_PLUGINS);

    const commands = await pluginManager.getCommands();

    return commands;
  });

export { getCommandsRoute };
