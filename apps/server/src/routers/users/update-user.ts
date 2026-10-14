import {
  DELETED_USER_IDENTITY_AND_NAME,
  HEX_COLOR_REGEX,
  MAX_USER_NAME_LENGTH,
  type TBeforeProfileUpdatePayload,
  type TBeforeProfileUpdateUpdate
} from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { publishUser } from '../../db/publishers';
import { users } from '../../db/schema';
import { pluginManager } from '../../plugins';
import { eventBus } from '../../plugins/event-bus';
import { runHook } from '../../plugins/run-hook';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const zName = z
  .string()
  .trim()
  .min(1)
  .max(MAX_USER_NAME_LENGTH)
  .refine((val) => val !== DELETED_USER_IDENTITY_AND_NAME, {
    message: 'Protected username'
  });

const zBio = z.string().max(160).optional();

const updateUserRoute = protectedProcedure
  .input(
    z.object({
      name: zName,
      profileColor: z.string().regex(HEX_COLOR_REGEX, 'Invalid hex color'),
      bio: zBio
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { name, bio } = await runHook<
      TBeforeProfileUpdatePayload,
      TBeforeProfileUpdateUpdate
    >({
      entries: pluginManager.getHooks('beforeProfileUpdate'),
      payload: { userId: ctx.userId, name: input.name, bio: input.bio },
      normalize: (payload, pluginId) => {
        const parsedName = zName.safeParse(payload.name);
        const parsedBio = zBio.safeParse(payload.bio);

        invariant(parsedName.success && parsedBio.success, {
          code: 'BAD_REQUEST',
          message: `Plugin '${pluginId}' replaced this profile with an invalid name or bio.`
        });

        return { ...payload, name: parsedName.data, bio: parsedBio.data };
      }
    });

    const updatedUser = await db
      .update(users)
      .set({
        name,
        profileColor: input.profileColor,
        bio: bio ?? null
      })
      .where(eq(users.id, ctx.userId))
      .returning()
      .get();

    publishUser(updatedUser.id, 'update');

    eventBus.emit('user:updated', {
      userId: updatedUser.id,
      username: updatedUser.name
    });
  });

export { updateUserRoute };
