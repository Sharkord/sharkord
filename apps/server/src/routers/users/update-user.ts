import {
  DELETED_USER_IDENTITY_AND_NAME,
  type ProfileTheme
} from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { publishUser } from '../../db/publishers';
import { users } from '../../db/schema';
import { protectedProcedure } from '../../utils/trpc';

const profileThemeSchema: z.ZodType<ProfileTheme> = z.object({
  banner: z.object({
    type: z.enum(['solid', 'gradient', 'radial']),
    colors: z
      .array(
        z
          .string()
          .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid hex color')
      )
      .min(1),
    angle: z.number().optional(),
    position: z
      .string()
      .refine(
        (v) =>
          [
            'center',
            'top',
            'bottom',
            'left',
            'right',
            'top left',
            'top right',
            'bottom left',
            'bottom right'
          ].includes(v) ||
          /^\d+% \d+%$/.test(v) ||
          /^\d+px \d+px$/.test(v)
      )
      .optional() as z.ZodType<ProfileTheme['banner']['position']>
  })
});

const updateUserRoute = protectedProcedure
  .input(
    z.object({
      name: z
        .string()
        .min(1)
        .max(24)
        .refine((val) => val !== DELETED_USER_IDENTITY_AND_NAME, {
          message: 'Protected username'
        }),
      profileTheme: profileThemeSchema,
      bio: z.string().max(160).optional()
    })
  )
  .mutation(async ({ ctx, input }) => {
    const updatedUser = await db
      .update(users)
      .set({
        name: input.name,
        profileTheme: input.profileTheme,
        bio: input.bio ?? null
      })
      .where(eq(users.id, ctx.userId))
      .returning()
      .get();

    publishUser(updatedUser.id, 'update');
  });

export { updateUserRoute };
