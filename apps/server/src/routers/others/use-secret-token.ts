import { ActivityLogType, OWNER_ROLE_ID, sha256 } from '@sharkord/shared';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { config } from '../../config';
import { db } from '../../db';
import { publishUser } from '../../db/publishers';
import { getSettings } from '../../db/queries/server';
import { userRoles } from '../../db/schema';
import { safeCompare } from '../../helpers/safe-compare';
import { enqueueActivityLog } from '../../queues/activity-log';
import { invariant } from '../../utils/invariant';
import { protectedProcedure, rateLimitedProcedure } from '../../utils/trpc';

const useSecretTokenRoute = rateLimitedProcedure(protectedProcedure, {
  maxRequests: config.rateLimiters.useSecretToken.maxRequests,
  windowMs: config.rateLimiters.useSecretToken.windowMs,
  logLabel: 'useSecretToken'
})
  .input(
    z.object({
      token: z.string()
    })
  )
  .mutation(async ({ input, ctx }) => {
    const settings = await getSettings();
    const hashedToken = await sha256(input.token);

    invariant(
      !!settings.secretToken && safeCompare(hashedToken, settings.secretToken),
      {
        code: 'FORBIDDEN',
        message: 'Invalid secret token'
      }
    );

    const existingOwnerRole = await db
      .select({ userId: userRoles.userId })
      .from(userRoles)
      .where(
        and(
          eq(userRoles.userId, ctx.userId),
          eq(userRoles.roleId, OWNER_ROLE_ID)
        )
      )
      .limit(1)
      .get();

    invariant(!existingOwnerRole, {
      code: 'CONFLICT',
      message: 'You already have the owner role.'
    });

    await db.insert(userRoles).values({
      userId: ctx.userId,
      roleId: OWNER_ROLE_ID,
      createdAt: Date.now()
    });

    publishUser(ctx.userId, 'update');

    enqueueActivityLog({
      type: ActivityLogType.USER_CLAIMED_OWNERSHIP,
      userId: ctx.userId
    });
  });

export { useSecretTokenRoute };
