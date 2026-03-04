import { Permission } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { isDirectMessageChannel } from '../../db/queries/dms';
import {
  channelRolePermissions,
  channelUserPermissions
} from '../../db/schema';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const getPermissionsRoute = protectedProcedure
  .input(
    z.object({
      channelId: z.number()
    })
  )
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.MANAGE_CHANNEL_PERMISSIONS);

    const isDmChannel = await isDirectMessageChannel(input.channelId);

    invariant(!isDmChannel, {
      code: 'FORBIDDEN',
      message: 'Cannot view DM channel permissions'
    });

    const [rolePermissions, userPermissions] = await Promise.all([
      db
        .select()
        .from(channelRolePermissions)
        .where(eq(channelRolePermissions.channelId, input.channelId)),
      db
        .select()
        .from(channelUserPermissions)
        .where(eq(channelUserPermissions.channelId, input.channelId))
    ]);

    return {
      rolePermissions,
      userPermissions
    };
  });

export { getPermissionsRoute };
