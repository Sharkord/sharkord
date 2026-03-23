import { Permission } from '@sharkord/shared';
import z from 'zod';
import { downloadPlugin } from '../../helpers/downloads';
import { pluginManager } from '../../plugins';
import { protectedProcedure } from '../../utils/trpc';

const updateRoute = protectedProcedure
  .input(
    z.object({
      pluginId: z.string().min(1),
      url: z.url()
    })
  )
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.MANAGE_PLUGINS);

    const wasEnabled = pluginManager.isEnabled(input.pluginId);

    if (wasEnabled) {
      await pluginManager.togglePlugin(input.pluginId, false);
    }

    await downloadPlugin(input.url);

    if (wasEnabled) {
      await pluginManager.togglePlugin(input.pluginId, true);
    }
  });

export { updateRoute };
