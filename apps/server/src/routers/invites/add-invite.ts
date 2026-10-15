import { Permission } from '@sharkord/shared';
import { config } from '../../config';
import { getRole } from '../../db/queries/roles';
import { assertCanModifyOwnerRole } from '../../helpers/assert-can-modify-owner-role';
import { createInvite, zCreateInvite } from '../../helpers/invites';
import { invariant } from '../../utils/invariant';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

const addInviteRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.adminCreate.maxRequests,
  windowMs: config.rateLimiters.adminCreate.windowMs,
  logLabel: 'addInvite'
})
  .input(zCreateInvite)
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.MANAGE_INVITES);

    // whoever registers with the invite is given the role, so attaching one is
    // assigning it, and is held to the same rules as users.addRole
    if (input.roleId) {
      const role = await getRole(input.roleId);

      invariant(role, {
        code: 'NOT_FOUND',
        message: 'Role not found'
      });

      await assertCanModifyOwnerRole(ctx.userId, role.id, 'assign');

      invariant(await ctx.hasPermission(role.permissions), {
        code: 'FORBIDDEN',
        message:
          'You cannot create an invite for a role with permissions that you do not have.'
      });
    }

    return createInvite(input, ctx.user.id, ctx.user.id);
  });

export { addInviteRoute };
