import { Permission, zPluginId } from '@sharkord/shared';
import z from 'zod';
import { config } from '../../config';
import { installPluginVersion } from '../../helpers/install-plugin-version';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

// also serves plugins.update: both ask for one version of one plugin to be the
// one on disk, and the activity log tells the two apart by what was there
const installRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.pluginInstall.maxRequests,
  windowMs: config.rateLimiters.pluginInstall.windowMs,
  logLabel: 'installPlugin'
})
  .input(
    z.object({
      pluginId: zPluginId,
      version: z.string().min(1)
    })
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.MANAGE_PLUGINS);

    await installPluginVersion(input.pluginId, input.version, ctx.user.id);
  });

export { installRoute };
