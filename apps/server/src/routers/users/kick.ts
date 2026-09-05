import { Permission } from '@sharkord/shared';
import z from 'zod';
import { assertCanActOnUser } from '../../helpers/assert-can-act-on-user';
import { ctxUserSessions, kickUser } from '../../helpers/moderation';
import { protectedProcedure } from '../../utils/trpc';

const kickRoute = protectedProcedure
  .input(
    z.object({
      userId: z.number(),
      reason: z.string().optional()
    })
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.MANAGE_USERS);

    await assertCanActOnUser(ctx.userId, input.userId);

    await kickUser(
      input.userId,
      input.reason,
      ctx.userId,
      ctxUserSessions(ctx, input.userId)
    );
  });

export { kickRoute };
