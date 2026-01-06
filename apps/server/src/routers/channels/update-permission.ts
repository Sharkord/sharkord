import {
  ActivityLogType,
  ChannelPermission,
  Permission
} from '@sharkord/shared';
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

const allPermissions = Object.values(ChannelPermission);

const updatePermissionsRoute = protectedProcedure
  .input(
    z
      .object({
        channelId: z.number(),
        userId: z.number().optional(),
        roleId: z.number().optional(),
        isCreate: z.boolean().optional().default(false),
        permissions: z.array(z.enum(ChannelPermission)).default([])
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

    const permissions = input.isCreate ? [] : input.permissions;

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

        const values = allPermissions.map((perm) => ({
          channelId: input.channelId,
          userId: input.userId!,
          permission: perm,
          allow: permissions.includes(perm),
          createdAt: Date.now()
        }));

        await tx.insert(channelUserPermissions).values(values);
      } else if (input.roleId) {
        await tx
          .delete(channelRolePermissions)
          .where(
            and(
              eq(channelRolePermissions.channelId, input.channelId),
              eq(channelRolePermissions.roleId, input.roleId)
            )
          );

        const values = allPermissions.map((perm) => ({
          channelId: input.channelId,
          roleId: input.roleId!,
          permission: perm,
          allow: permissions.includes(perm),
          createdAt: Date.now()
        }));

        await tx.insert(channelRolePermissions).values(values);
      }
    });

    publishChannelPermissions(
      await getAffectedUserIdsForChannel(input.channelId)
    );
    enqueueActivityLog({
      type: ActivityLogType.UPDATED_CHANNEL_PERMISSIONS,
      userId: ctx.user.id,
      details: {
        channelId: input.channelId,
        targetUserId: input.userId,
        targetRoleId: input.roleId,
        permissions: allPermissions.map((perm) => ({
          permission: perm,
          allow: permissions.includes(perm)
        }))
      }
    });
  });

export { updatePermissionsRoute };
