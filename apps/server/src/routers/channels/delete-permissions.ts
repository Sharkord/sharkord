import { ActivityLogType, Permission } from '@sharkord/shared';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { publishChannelPermissions } from '../../db/publishers';
import { getAffectedOnlineUserIdsForChannel } from '../../db/queries/channels';
import { isDirectMessageChannel } from '../../db/queries/dms';
import {
  channelRolePermissions,
  channelUserPermissions
} from '../../db/schema';
import { enqueueActivityLog } from '../../queues/activity-log';
import { invariant } from '../../utils/invariant';
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
    await ctx.needsPermission(Permission.MANAGE_CHANNEL_PERMISSIONS);

    const isDmChannel = await isDirectMessageChannel(input.channelId);

    invariant(!isDmChannel, {
      code: 'FORBIDDEN',
      message: 'Cannot delete DM channel permissions'
    });

    db.transaction((tx) => {
      if (input.userId) {
        tx.delete(channelUserPermissions)
          .where(
            and(
              eq(channelUserPermissions.channelId, input.channelId),
              eq(channelUserPermissions.userId, input.userId)
            )
          )
          .run();
      } else if (input.roleId) {
        tx.delete(channelRolePermissions)
          .where(
            and(
              eq(channelRolePermissions.channelId, input.channelId),
              eq(channelRolePermissions.roleId, input.roleId)
            )
          )
          .run();
      }
    });

    const affectedUserIds = await getAffectedOnlineUserIdsForChannel(
      input.channelId
    );

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
