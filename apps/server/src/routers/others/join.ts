import {
  ActivityLogType,
  ServerEvents,
  UserStatus,
  type TPublicServerSettings
} from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import {
  getAllChannelUserPermissions,
  getChannelsReadStatesForUser
} from '../../db/queries/channels';
import { getEmojis } from '../../db/queries/emojis';
import { getRoles } from '../../db/queries/roles';
import { getSettings } from '../../db/queries/server';
import { getPublicUsers } from '../../db/queries/users';
import { categories, channels, users } from '../../db/schema';
import { logger } from '../../logger';
import { pluginManager } from '../../plugins';
import { eventBus } from '../../plugins/event-bus';
import { enqueueActivityLog } from '../../queues/activity-log';
import { enqueueLogin } from '../../queues/logins';
import { VoiceRuntime } from '../../runtimes/voice';
import { invariant } from '../../utils/invariant';
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

    invariant(
      input.handshakeHash &&
        ctx.handshakeHash &&
        input.handshakeHash === ctx.handshakeHash,
      {
        code: 'FORBIDDEN',
        message: 'Invalid handshake hash'
      }
    );

    invariant(hasPassword ? input.password === settings?.password : true, {
      code: 'FORBIDDEN',
      message: 'Invalid password'
    });

    invariant(ctx.user, {
      code: 'UNAUTHORIZED',
      message: 'User not authenticated'
    });

    ctx.authenticated = true;
    ctx.setWsUserId(ctx.user.id);

    const [
      allCategories,
      channelsForUser,
      publicUsers,
      roles,
      emojis,
      channelPermissions,
      readStates
    ] = await Promise.all([
      db.select().from(categories),
      db.select().from(channels),
      getPublicUsers(true), // return identity to get status of already connected users
      getRoles(),
      getEmojis(),
      getAllChannelUserPermissions(ctx.user.id),
      getChannelsReadStatesForUser(ctx.user.id)
    ]);

    const processedPublicUsers = publicUsers.map((u) => ({
      ...u,
      status: ctx.getStatusById(u.id),
      _identity: undefined // remove identity before sending to client
    }));

    const foundPublicUser = processedPublicUsers.find(
      (u) => u.id === ctx.user.id
    );

    invariant(foundPublicUser, {
      code: 'NOT_FOUND',
      message: 'User not present in public users'
    });

    logger.info(`%s joined the server`, ctx.user.name);

    const publicSettings: TPublicServerSettings = {
      description: settings.description ?? '',
      name: settings.name,
      serverId: settings.serverId,
      storageUploadEnabled: settings.storageUploadEnabled,
      storageQuota: settings.storageQuota,
      storageUploadMaxFileSize: settings.storageUploadMaxFileSize,
      storageSpaceQuotaByUser: settings.storageSpaceQuotaByUser,
      storageOverflowAction: settings.storageOverflowAction,
      enablePlugins: settings.enablePlugins
    };

    ctx.pubsub.publish(ServerEvents.USER_JOIN, {
      ...foundPublicUser,
      status: UserStatus.ONLINE
    });

    const connectionInfo = ctx.getConnectionInfo();

    if (connectionInfo?.ip) {
      ctx.saveUserIp(ctx.user.id, connectionInfo.ip);
    }

    const voiceMap = VoiceRuntime.getVoiceMap();
    const externalStreamsMap = VoiceRuntime.getExternalStreamsMap();

    await db
      .update(users)
      .set({ lastLoginAt: Date.now() })
      .where(eq(users.id, ctx.user.id));

    enqueueLogin(ctx.user.id, connectionInfo);
    enqueueActivityLog({
      type: ActivityLogType.USER_JOINED,
      userId: ctx.user.id,
      ip: connectionInfo?.ip
    });

    eventBus.emit('user:joined', {
      userId: ctx.user.id,
      username: ctx.user.name
    });

    return {
      categories: allCategories,
      channels: channelsForUser,
      users: processedPublicUsers,
      serverId: settings.serverId,
      serverName: settings.name,
      ownUserId: ctx.user.id,
      voiceMap,
      roles,
      emojis,
      publicSettings,
      channelPermissions,
      readStates,
      commands: pluginManager.getCommands(),
      externalStreamsMap
    };
  });

export { joinServerRoute };
