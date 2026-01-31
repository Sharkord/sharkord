import { Permission } from '@sharkord/shared';
import z from 'zod';
import { pluginManager } from '../../plugins';
import { protectedProcedure } from '../../utils/trpc';

const updateSettingRoute = protectedProcedure
  .input(
    z.object({
      pluginId: z.string(),
      key: z.string(),
      value: z.union([z.string(), z.number(), z.boolean()])
    })
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.MANAGE_PLUGINS);

    await pluginManager.updatePluginSetting(
      input.pluginId,
      input.key,
      input.value
    );
  });

export { updateSettingRoute };
