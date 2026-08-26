import {
  ActivityLogType,
  ChannelPermission,
  Permission
} from '@sharkord/shared';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { publishChannelAccessChange } from '../../db/publishers';
import { getAffectedOnlineUserIdsForChannel } from '../../db/queries/channels';
import { isDirectMessageChannel } from '../../db/queries/dms';
import {
  channelRolePermissions,
  channels,
  channelUserPermissions,
  roles,
  users
} from '../../db/schema';
import { enqueueActivityLog } from '../../queues/activity-log';
import { invariant } from '../../utils/invariant';
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
    await ctx.needsPermission(Permission.MANAGE_CHANNEL_PERMISSIONS);

    const isDmChannel = await isDirectMessageChannel(input.channelId);

    invariant(!isDmChannel, {
      code: 'FORBIDDEN',
      message: 'Cannot update DM channel permissions'
    });

    const [channel, target] = await Promise.all([
      db
        .select({ id: channels.id })
        .from(channels)
        .where(eq(channels.id, input.channelId))
        .limit(1)
        .get(),

      input.userId
        ? db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.id, input.userId))
            .limit(1)
            .get()
        : db
            .select({ id: roles.id })
            .from(roles)
            .where(eq(roles.id, input.roleId!))
            .limit(1)
            .get()
    ]);

    invariant(channel, {
      code: 'NOT_FOUND',
      message: 'Channel not found'
    });

    invariant(target, {
      code: 'NOT_FOUND',
      message: input.userId ? 'User not found' : 'Role not found'
    });

    const permissions = input.isCreate ? [] : input.permissions;

    const audienceBefore = await getAffectedOnlineUserIdsForChannel(
      input.channelId,
      ChannelPermission.VIEW_CHANNEL
    );

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

        const values = allPermissions.map((perm) => ({
          channelId: input.channelId,
          userId: input.userId!,
          permission: perm,
          allow: permissions.includes(perm),
          createdAt: Date.now()
        }));

        tx.insert(channelUserPermissions).values(values).run();
      } else if (input.roleId) {
        tx.delete(channelRolePermissions)
          .where(
            and(
              eq(channelRolePermissions.channelId, input.channelId),
              eq(channelRolePermissions.roleId, input.roleId)
            )
          )
          .run();

        const values = allPermissions.map((perm) => ({
          channelId: input.channelId,
          roleId: input.roleId!,
          permission: perm,
          allow: permissions.includes(perm),
          createdAt: Date.now()
        }));

        tx.insert(channelRolePermissions).values(values).run();
      }
    });

    await publishChannelAccessChange(input.channelId, audienceBefore);
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
