import { Permission } from '@sharkord/shared';
import { z } from 'zod';
import { getRole } from '../../db/queries/roles';
import { assertCanActOnUser } from '../../helpers/assert-can-act-on-user';
import { assignRole } from '../../helpers/user-roles';
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

    await assertCanActOnUser(ctx.userId, input.userId);

    await assignRole(input.userId, role);
  });

export { addRoleRoute };
