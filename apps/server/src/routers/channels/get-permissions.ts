import { Permission } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import {
  channelRolePermissions,
  channelUserPermissions
} from '../../db/schema';
import { protectedProcedure } from '../../utils/trpc';

const getPermissionsRoute = protectedProcedure
  .input(
    z.object({
      channelId: z.number()
    })
  )
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.MANAGE_CHANNEL_PERMISSIONS);

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
