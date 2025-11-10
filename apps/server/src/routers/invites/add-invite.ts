import { ActivityLogType, getRandomString, Permission } from '@sharkord/shared';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { createInvite } from '../../db/mutations/invites/create-invite';
import { getInviteByCode } from '../../db/queries/invites/get-invite-by-code';
import { enqueueActivityLog } from '../../queues/activity-log';
import { protectedProcedure } from '../../utils/trpc';

const addInviteRoute = protectedProcedure
  .input(
    z.object({
      maxUses: z.number().min(0).max(100).optional().default(0),
      expiresAt: z.number().optional().nullable().default(null),
      code: z.string().min(4).max(64).optional()
    })
  )
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.MANAGE_INVITES);

    const newCode = input.code || getRandomString(24);

    const existingInvite = await getInviteByCode(newCode);

    if (existingInvite) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'Invite code should be unique'
      });
    }

    const invite = await createInvite({
      code: newCode,
      creatorId: ctx.userId,
      maxUses: input.maxUses || null,
      uses: 0,
      expiresAt: input.expiresAt || null
    });

    if (!invite) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Could not create invite'
      });
    }

    enqueueActivityLog({
      type: ActivityLogType.CREATED_INVITE,
      userId: ctx.user.id,
      details: {
        code: invite.code,
        maxUses: invite.maxUses || 0,
        expiresAt: invite.expiresAt
      }
    });

    return invite;
  });

export { addInviteRoute };
