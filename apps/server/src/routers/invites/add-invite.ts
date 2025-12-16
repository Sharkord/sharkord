import { ActivityLogType, getRandomString, Permission } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { invites } from '../../db/schema';
import { enqueueActivityLog } from '../../queues/activity-log';
import { invariant } from '../../utils/invariant';
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
    const existingInvite = await db
      .select()
      .from(invites)
      .where(eq(invites.code, newCode))
      .get();

    invariant(!existingInvite, 'Invite code should be unique');

    const invite = await db
      .insert(invites)
      .values({
        code: newCode,
        creatorId: ctx.user.id,
        maxUses: input.maxUses || null,
        uses: 0,
        expiresAt: input.expiresAt || null,
        createdAt: Date.now()
      })
      .returning()
      .get();

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
