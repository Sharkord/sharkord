import { ActivityLogType, Permission } from '@sharkord/shared';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { publishChannelPermissions } from '../../db/publishers';
import { getAffectedUserIdsForChannel } from '../../db/queries/channels';
import {
  channelRolePermissions,
  channelUserPermissions
} from '../../db/schema';
import { enqueueActivityLog } from '../../queues/activity-log';
import { protectedProcedure } from '../../utils/trpc';

const deletePermissionsRoute = protectedProcedure
  .input(
    z
      .object({
        channelId: z.number(),
        userId: z.number().optional(),
        roleId: z.number().optional()
      })
      .refine((data) => !!(data.userId || data.roleId), {
        message: 'Either userId or roleId must be provided'
      })
      .refine((data) => !(data.userId && data.roleId), {
        message: 'Cannot specify both userId and roleId'
      })
  )
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.MANAGE_CHANNELS);

    const affectedUserIds = await getAffectedUserIdsForChannel(input.channelId);

    await db.transaction(async (tx) => {
      if (input.userId) {
        await tx
          .delete(channelUserPermissions)
          .where(
            and(
              eq(channelUserPermissions.channelId, input.channelId),
              eq(channelUserPermissions.userId, input.userId)
            )
          );
      } else if (input.roleId) {
        await tx
          .delete(channelRolePermissions)
          .where(
            and(
              eq(channelRolePermissions.channelId, input.channelId),
              eq(channelRolePermissions.roleId, input.roleId)
            )
          );
      }
    });

    publishChannelPermissions(affectedUserIds);
    enqueueActivityLog({
      type: ActivityLogType.DELETED_CHANNEL_PERMISSIONS,
      userId: ctx.user.id,
      details: {
        channelId: input.channelId,
        targetUserId: input.userId,
        targetRoleId: input.roleId
      }
    });
  });

export { deletePermissionsRoute };
