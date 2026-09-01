import { Permission } from '@sharkord/shared';
import z from 'zod';
import { assertCanActOnUser } from '../../helpers/assert-can-act-on-user';
import { banUser } from '../../helpers/moderation';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const banRoute = protectedProcedure
  .input(
    z.object({
      userId: z.number(),
      reason: z.string().optional()
    })
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.MANAGE_USERS);

    invariant(input.userId !== ctx.user.id, {
      code: 'BAD_REQUEST',
      message: 'You cannot ban yourself.'
    });

    await assertCanActOnUser(ctx.userId, input.userId);

    await banUser(input.userId, input.reason, ctx.userId, {
      count: () => ctx.getUserWs(input.userId).length,
      close: (code, reason) =>
        ctx.getUserWs(input.userId).forEach((s) => s.close(code, reason))
    });
  });

export { banRoute };
