import { Permission } from '@sharkord/shared';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { publishChannelListChange, publishUser } from '../../db/publishers';
import { getChannelsForUser } from '../../db/queries/channels';
import { getRole } from '../../db/queries/roles';
import { userRoles } from '../../db/schema';
import { assertCanActOnUser } from '../../helpers/assert-can-act-on-user';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';
import { assertCanModifyOwnerRole } from './assert-can-modify-owner-role';

const addRoleRoute = protectedProcedure
  .input(
    z.object({
      userId: z.number(),
      roleId: z.number()
    })
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.MANAGE_USERS);

    const role = await getRole(input.roleId);

    invariant(role, {
      code: 'NOT_FOUND',
      message: 'Role not found'
    });

    await assertCanModifyOwnerRole(ctx.userId, input.roleId, 'assign');

    invariant(await ctx.hasPermission(role.permissions), {
      code: 'FORBIDDEN',
      message: 'You cannot assign a role with permissions that you do not have.'
    });

    const existing = await db
      .select()
      .from(userRoles)
      .where(
        and(
          eq(userRoles.userId, input.userId),
          eq(userRoles.roleId, input.roleId)
        )
      )
      .limit(1);

    invariant(existing.length === 0, {
      code: 'CONFLICT',
      message: 'User already has this role'
    });

    await assertCanActOnUser(ctx.userId, input.userId);

    const channelsBefore = await getChannelsForUser(input.userId);

    await db.insert(userRoles).values({
      userId: input.userId,
      roleId: input.roleId,
      createdAt: Date.now()
    });

    publishUser(input.userId, 'update');

    await publishChannelListChange(
      input.userId,
      channelsBefore.map((channel) => channel.id)
    );
  });

export { addRoleRoute };
