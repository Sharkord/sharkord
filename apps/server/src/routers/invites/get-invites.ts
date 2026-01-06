import { Permission } from '@sharkord/shared';
import { getInvites } from '../../db/queries/invites';
import { protectedProcedure } from '../../utils/trpc';

const getInvitesRoute = protectedProcedure.query(async ({ ctx }) => {
  await ctx.needsPermission(Permission.MANAGE_INVITES);

  const invites = await getInvites();

  return invites;
});

export { getInvitesRoute };
