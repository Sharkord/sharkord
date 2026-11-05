import { Permission } from '@sharkord/shared';
import z from 'zod';
import { assertCanActOnUser } from '../../helpers/assert-can-act-on-user';
import { unbanUser } from '../../helpers/moderation';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const unbanRoute = protectedProcedure
  .input(z.object({ userId: z.number() }))
  .mutation(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.MANAGE_USERS);

    invariant(input.userId !== ctx.user.id, {
      code: 'BAD_REQUEST',
      message: 'You cannot unban yourself.'
    });

    await assertCanActOnUser(ctx.userId, input.userId);

    await unbanUser(input.userId, ctx.userId);
  });

export { unbanRoute };
