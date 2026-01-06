import { OWNER_ROLE_ID, sha256 } from '@sharkord/shared';
import { z } from 'zod';
import { db } from '../../db';
import { publishUser } from '../../db/publishers';
import { getSettings } from '../../db/queries/server';
import { userRoles } from '../../db/schema';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const useSecretTokenRoute = protectedProcedure
  .input(
    z.object({
      token: z.string()
    })
  )
  .mutation(async ({ input, ctx }) => {
    const settings = await getSettings();
    const hashedToken = await sha256(input.token);

    invariant(hashedToken === settings.secretToken, {
      code: 'FORBIDDEN',
      message: 'Invalid secret token'
    });

    await db.insert(userRoles).values({
      userId: ctx.userId,
      roleId: OWNER_ROLE_ID,
      createdAt: Date.now()
    });

    await publishUser(ctx.userId, 'update');
  });

export { useSecretTokenRoute };
