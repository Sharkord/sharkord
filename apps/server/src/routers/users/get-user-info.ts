import { Permission, type TLogin } from '@sharkord/shared';
import z from 'zod';
import { getFilesByUserId } from '../../db/queries/files';
import { getLastLogins } from '../../db/queries/logins';
import { getNonDirectMessagesFromUserId } from '../../db/queries/messages';
import { getEffectiveStorageSpaceQuotaByUserId } from '../../db/queries/roles';
import { getSettings } from '../../db/queries/server';
import { getStorageUsageByUserId, getUserById } from '../../db/queries/users';
import { clearFields } from '../../helpers/clear-fields';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const getUserInfoRoute = protectedProcedure
  .input(
    z.object({
      userId: z.number()
    })
  )
  .query(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.MANAGE_USERS);

    const user = await getUserById(input.userId);

    invariant(user, {
      code: 'NOT_FOUND',
      message: 'User not found'
    });

    const [logins, files, messages, storageUsage, settings] = await Promise.all(
      [
        getLastLogins(user.id, 6),
        getFilesByUserId(user.id),
        getNonDirectMessagesFromUserId(user.id),
        getStorageUsageByUserId(user.id),
        getSettings()
      ]
    );

    const storageQuota = await getEffectiveStorageSpaceQuotaByUserId(
      user.id,
      settings.storageSpaceQuotaByUser
    );

    let cleanUser = clearFields(user, ['password']);
    let cleanLogins: TLogin[] = [...logins];

    if (!(await ctx.hasPermission(Permission.VIEW_USER_SENSITIVE_DATA))) {
      // doesn't have permission to view sensitive data, remove identity, ip and location
      cleanUser = clearFields(cleanUser, ['identity']);
      cleanLogins = logins.map((login) => ({
        ...login,
        ip: null,
        loc: null
      }));
    }

    return {
      user: cleanUser,
      logins: cleanLogins,
      files,
      messages,
      storage: {
        ...storageUsage,
        quota: storageQuota
      }
    };
  });

export { getUserInfoRoute };
