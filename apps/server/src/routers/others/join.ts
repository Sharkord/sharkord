import {
  ServerEvents,
  UserStatus,
  type TPublicServerSettings
} from '@sharkord/shared';
import { z } from 'zod';
import { db } from '../../db';
import { getEmojis } from '../../db/queries/emojis/get-emojis';
import { getSettings } from '../../db/queries/others/get-settings';
import { getRoles } from '../../db/queries/roles/get-roles';
import { getPublicUsers } from '../../db/queries/users/get-public-users';
import { categories, channels } from '../../db/schema';
import { logger } from '../../logger';
import { t } from '../../utils/trpc';

const joinServerRoute = t.procedure
  .input(
    z.object({
      handshakeHash: z.string(),
      password: z.string().optional()
    })
  )
  .query(async ({ input, ctx }) => {
    const settings = await getSettings();
    const hasPassword = !!settings?.password;

    if (input.handshakeHash !== ctx.handshakeHash) {
      throw new Error('Invalid handshake hash');
    }

    if (hasPassword && input.password !== settings?.password) {
      throw new Error('Invalid password');
    }

    if (!ctx.user) {
      throw new Error('User not found');
    }

    ctx.authenticated = true;
    ctx.setWsUserId(ctx.user.id);

    const [allCategories, allChannels, publicUsers, roles, emojis] =
      await Promise.all([
        db.select().from(categories),
        db.select().from(channels),
        getPublicUsers(true), // return identity to get status of already connected users
        getRoles(),
        getEmojis()
      ]);

    const processedPublicUsers = publicUsers.map((u) => ({
      ...u,
      status: ctx.getStatusById(u.id),
      _identity: undefined // remove identity before sending to client
    }));

    const foundPublicUser = processedPublicUsers.find(
      (u) => u.id === ctx.user.id
    );

    logger.info(`%s joined the server`, ctx.user.name);

    const publicSettings: TPublicServerSettings = {
      description: settings.description ?? '',
      name: settings.name,
      serverId: settings.serverId,
      storageUploadEnabled: settings.storageUploadEnabled,
      storageQuota: settings.storageQuota,
      storageUploadMaxFileSize: settings.storageUploadMaxFileSize,
      storageSpaceQuotaByUser: settings.storageSpaceQuotaByUser,
      storageOverflowAction: settings.storageOverflowAction
    };

    ctx.pubsub.publish(ServerEvents.USER_JOIN, {
      ...foundPublicUser!,
      status: UserStatus.ONLINE
    });

    return {
      categories: allCategories,
      channels: allChannels,
      users: processedPublicUsers,
      serverId: settings.serverId,
      serverName: settings.name,
      ownUser: {
        ...ctx.user,
        identity: ''
      },
      roles,
      emojis,
      publicSettings
    };
  });

export { joinServerRoute };
