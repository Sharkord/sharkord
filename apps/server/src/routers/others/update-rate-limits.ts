import { ActivityLogType, Permission, zRateLimiters } from '@sharkord/shared';
import { updateSettings } from '../../db/mutations/server';
import { setRateLimits } from '../../helpers/rate-limits';
import { enqueueActivityLog } from '../../queues/activity-log';
import { protectedProcedure } from '../../utils/trpc';

const updateRateLimitsRoute = protectedProcedure
  .input(zRateLimiters)
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.MANAGE_SETTINGS);

    await updateSettings({ rateLimiters: input });

    setRateLimits(input);

    enqueueActivityLog({
      type: ActivityLogType.EDIT_SERVER_SETTINGS,
      userId: ctx.userId,
      details: { values: { rateLimiters: input } }
    });
  });

export { updateRateLimitsRoute };
