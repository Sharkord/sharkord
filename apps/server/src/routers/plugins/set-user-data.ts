import { Permission, zPluginId } from '@sharkord/shared';
import z from 'zod';
import { config } from '../../config';
import { setPluginUserData } from '../../db/queries/plugin-user-data';
import { pluginManager } from '../../plugins';
import { invariant } from '../../utils/invariant';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

const setUserDataRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.pluginExecute.maxRequests,
  windowMs: config.rateLimiters.pluginExecute.windowMs,
  logLabel: 'setPluginUserData'
})
  .input(
    z.object({
      pluginId: zPluginId,
      data: z.record(z.string(), z.unknown())
    })
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.USE_PLUGINS);

    // without this any id writes a row, and one naming a plugin that was never
    // installed has nothing left to clean it up
    invariant(pluginManager.isEnabled(input.pluginId), {
      code: 'NOT_FOUND',
      message: 'This plugin is not available.'
    });

    await setPluginUserData(input.pluginId, ctx.user.id, input.data);
  });

export { setUserDataRoute };
