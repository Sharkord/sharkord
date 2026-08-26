import {
  ActivityLogType,
  getRandomString,
  INVITE_CODE_REGEX,
  Permission
} from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { config } from '../../config';
import { db } from '../../db';
import { invites, roles } from '../../db/schema';
import { enqueueActivityLog } from '../../queues/activity-log';
import { invariant } from '../../utils/invariant';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

const addInviteRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.adminCreate.maxRequests,
  windowMs: config.rateLimiters.adminCreate.windowMs,
  logLabel: 'addInvite'
})
  .input(
    z.object({
      maxUses: z.number().int().min(0).max(100).optional().default(0),
      expiresAt: z.number().int().optional().nullable().default(null),
      code: z
        .string()
        .min(4)
        .max(64)
        .regex(INVITE_CODE_REGEX, 'Invalid invite code')
        .optional(),
      roleId: z.number().optional()
    })
  )
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.MANAGE_INVITES);

    invariant(!input.expiresAt || input.expiresAt > Date.now(), {
      code: 'BAD_REQUEST',
      message: 'The expiration date must be in the future.'
    });

    if (input.roleId) {
      const role = await db
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.id, input.roleId))
        .limit(1)
        .get();

      invariant(role, {
        code: 'NOT_FOUND',
        message: 'Role not found'
      });
    }

    const newCode = input.code || getRandomString(24);

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
      .onConflictDoNothing()
      .returning()
      .get();

    invariant(invite, {
      code: 'CONFLICT',
      message: 'An invite with this code already exists'
    });

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
