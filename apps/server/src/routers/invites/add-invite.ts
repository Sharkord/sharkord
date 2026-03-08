import { ActivityLogType, getRandomString, Permission } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { invites, roles } from '../../db/schema';
import { enqueueActivityLog } from '../../queues/activity-log';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const addInviteRoute = protectedProcedure
  .input(
    z.object({
      maxUses: z.number().min(0).max(100).optional().default(0),
      expiresAt: z.number().optional().nullable().default(null),
      code: z.string().min(4).max(64).optional(),
      roleId: z.number().optional()
    })
  )
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.MANAGE_INVITES);

    if (input.roleId) {
      const role = await db
        .select()
        .from(roles)
        .where(eq(roles.id, input.roleId))
        .get();

      invariant(role, {
        code: 'NOT_FOUND',
        message: 'Role not found'
      });
    }

    const newCode = input.code || getRandomString(24);
    const existingInvite = await db
      .select()
      .from(invites)
      .where(eq(invites.code, newCode))
      .get();

    invariant(!existingInvite, {
      code: 'CONFLICT',
      message: 'An invite with this code already exists'
    });

    const invite = await db
      .insert(invites)
      .values({
        code: newCode,
        creatorId: ctx.user.id,
        roleId: input.roleId || null,
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
