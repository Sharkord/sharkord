import {
  DELETED_USER_IDENTITY_AND_NAME,
  HEX_COLOR_REGEX,
  MAX_USER_NAME_LENGTH,
  type TBeforeProfileUpdatePayload,
  type TBeforeProfileUpdateUpdate
} from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db';
import { publishUser } from '../db/publishers';
import { users } from '../db/schema';
import { pluginManager } from '../plugins';
import { eventBus } from '../plugins/event-bus';
import { runHook } from '../plugins/run-hook';
import { invariant } from '../utils/invariant';

const zName = z
  .string()
  .trim()
  .min(1)
  .max(MAX_USER_NAME_LENGTH)
  .refine((val) => val !== DELETED_USER_IDENTITY_AND_NAME, {
    message: 'Protected username'
  });

const zBio = z.string().max(160);

const zProfileColor = z.string().regex(HEX_COLOR_REGEX, 'Invalid hex color');

const zUpdateUserProfile = z.object({
  name: zName.optional(),
  bio: zBio.nullable().optional(),
  profileColor: zProfileColor.optional()
});

type TUpdateUserProfile = z.input<typeof zUpdateUserProfile>;

const updateUserProfile = async (userId: number, input: TUpdateUserProfile) => {
  const values = zUpdateUserProfile.parse(input);

  const user = await db
    .select({ name: users.name, bio: users.bio })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
    .get();

  invariant(user, {
    code: 'NOT_FOUND',
    message: 'User not found'
  });

  let currentBio = user.bio;

  if (values.bio !== undefined) {
    currentBio = values.bio;
  }

  const { name, bio } = await runHook<
    TBeforeProfileUpdatePayload,
    TBeforeProfileUpdateUpdate
  >({
    entries: pluginManager.getHooks('beforeProfileUpdate'),
    payload: {
      userId,
      name: values.name ?? user.name,
      bio: currentBio ?? undefined
    },
    normalize: (payload, pluginId) => {
      const parsedName = zName.safeParse(payload.name);
      const parsedBio = zBio.optional().safeParse(payload.bio);

      invariant(parsedName.success && parsedBio.success, {
        code: 'BAD_REQUEST',
        message: `Plugin '${pluginId}' replaced this profile with an invalid name or bio.`
      });

      return { ...payload, name: parsedName.data, bio: parsedBio.data };
    }
  });

  await db
    .update(users)
    .set({
      name,
      bio: bio ?? null,
      ...(values.profileColor !== undefined && {
        profileColor: values.profileColor
      })
    })
    .where(eq(users.id, userId))
    .run();

  publishUser(userId, 'update');

  eventBus.emit('user:updated', { userId, username: name });
};

export {
  updateUserProfile,
  zBio,
  zName,
  zProfileColor,
  type TUpdateUserProfile
};
