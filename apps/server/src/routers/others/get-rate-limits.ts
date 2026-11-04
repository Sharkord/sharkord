import { Permission } from '@sharkord/shared';
import { config } from '../../config';
import { getRateLimits } from '../../helpers/rate-limits';
import { protectedProcedure } from '../../utils/trpc';

const getRateLimitsRoute = protectedProcedure.query(async ({ ctx }) => {
  await ctx.needsPermission(Permission.MANAGE_SETTINGS);

  return {
    rateLimits: getRateLimits(),
    enabledInConfig: config.server.rateLimitersEnabled
  };
});

export { getRateLimitsRoute };
