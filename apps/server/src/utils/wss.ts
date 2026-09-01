import {
  ActivityLogType,
  ChannelPermission,
  DisconnectCode,
  getErrorMessage,
  OWNER_ROLE_ID,
  Permission,
  ServerEvents,
  UserStatus,
  type TConnectionParams
} from '@sharkord/shared';
import { TRPCError } from '@trpc/server';
import {
  applyWSSHandler,
  type CreateWSSContextFnOptions
} from '@trpc/server/adapters/ws';
import http from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { channelUserCan } from '../db/queries/channels';
import { getUserRoles } from '../db/queries/roles';
import { getUserById, getUserByToken } from '../db/queries/users';
import { getWsInfo } from '../helpers/get-ws-info';
import { logger } from '../logger';
import { eventBus } from '../plugins/event-bus';
import { enqueueActivityLog } from '../queues/activity-log';
import { appRouter } from '../routers';
import { VoiceRuntime } from '../runtimes/voice';
import { invariant } from './invariant';
import { pubsub } from './pubsub';
import type { Context } from './trpc';

let wss: WebSocketServer | undefined;

const usersIpMap = new Map<number, string>();

const userSockets = new Map<number, Set<WebSocket>>();

const trackUserSocket = (userId: number, ws: WebSocket) => {
  const sockets = userSockets.get(userId) ?? new Set<WebSocket>();

  sockets.add(ws);
  userSockets.set(userId, sockets);
};

const untrackUserSocket = (userId: number, ws: WebSocket) => {
  const sockets = userSockets.get(userId);

  if (!sockets) return;

  sockets.delete(ws);

  if (sockets.size === 0) userSockets.delete(userId);
};

const clearUserSocketsForTests = () => {
  userSockets.clear();
  usersIpMap.clear();
};

const getUserIp = (userId: number): string | undefined => {
  return usersIpMap.get(userId);
};

const disconnectUser = (
  userId: number,
  code: DisconnectCode,
  reason?: string
) => {
  userSockets.get(userId)?.forEach((socket) => socket.close(code, reason));
};

const getOnlineUserIds = (): number[] => Array.from(userSockets.keys());

const createContext = async ({
  info,
  req,
  res: ws
}: CreateWSSContextFnOptions): Promise<Context> => {
  const { token } = info.connectionParams as TConnectionParams;

  const decodedUser = await getUserByToken(token);

  invariant(decodedUser, {
    code: 'UNAUTHORIZED',
    message: 'Invalid authentication token'
  });

  const hasPermission = async (targetPermission: Permission | Permission[]) => {
    const user = await getUserById(decodedUser.id);

    if (!user) return false;

    const roles = await getUserRoles(user.id);

    const hasOwnerRole = roles.some((r) => r.id === OWNER_ROLE_ID);

    if (hasOwnerRole) return true; // owner always has all permissions

    const permissionsSet = new Set<Permission>();

    for (const role of roles) {
      for (const permission of role.permissions) {
        permissionsSet.add(permission);
      }
    }

    if (Array.isArray(targetPermission)) {
      return targetPermission.every((p) => permissionsSet.has(p));
    }

    return permissionsSet.has(targetPermission);
  };

  const hasChannelPermission = async (
    channelId: number,
    targetPermission: ChannelPermission
  ) => channelUserCan(channelId, decodedUser.id, targetPermission);

  const getOwnWs = () => ws;

  const getUserWs = (userId: number) => {
    if (!wss) return [];

    return Array.from(wss.clients).filter((client) => client.userId === userId);
  };

  const getStatusById = (userId: number) =>
    userSockets.has(userId) ? UserStatus.ONLINE : UserStatus.OFFLINE;

  const setWsUserId = (userId: number) => {
    if (!ws) return;

    ws.userId = userId;
    trackUserSocket(userId, ws);
  };

  const getConnectionInfo = () => getWsInfo(ws, req);

  const needsPermission = async (
    targetPermission: Permission | Permission[]
  ) => {
    invariant(await hasPermission(targetPermission), {
      code: 'FORBIDDEN',
      message: 'Insufficient permissions'
    });
  };

  const needsChannelPermission = async (
    channelId: number,
    targetPermission: ChannelPermission
  ) => {
    invariant(await hasChannelPermission(channelId, targetPermission), {
      code: 'FORBIDDEN',
      message: 'Insufficient channel permissions'
    });
  };

  const throwValidationError = (field: string, message: string) => {
    // this mimics the zod validation error format
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: JSON.stringify([
        {
          code: 'custom',
          path: [field],
          message
        }
      ])
    });
  };

  const saveUserIp = async (userId: number, ip: string) => {
    usersIpMap.set(userId, ip);
  };

  return {
    pubsub,
    token,
    user: decodedUser,
    authenticated: false,
    userId: decodedUser.id,
    handshakeHash: '',
    currentVoiceChannelId: undefined,
    hasPermission,
    needsPermission,
    hasChannelPermission,
    needsChannelPermission,
    getOwnWs,
    getStatusById,
    setWsUserId,
    getUserWs,
    getConnectionInfo,
    throwValidationError,
    saveUserIp
  };
};

const handleSocketClose = async (ws: WebSocket) => {
  try {
    const userId = ws.userId;

    // ignore connections that never authenticated through joinServer
    if (!userId) {
      return;
    }

    untrackUserSocket(userId, ws);

    // only mark as offline when there are no other active sessions
    if (userSockets.has(userId)) {
      return;
    }

    const user = await getUserById(userId);

    if (!user) return;

    const voiceRuntime = VoiceRuntime.findRuntimeByUserId(user.id);

    if (voiceRuntime) {
      voiceRuntime.removeUser(user.id);

      pubsub.publish(ServerEvents.USER_LEAVE_VOICE, {
        channelId: voiceRuntime.id,
        userId: user.id
      });
    }

    usersIpMap.delete(user.id);
    pubsub.publish(ServerEvents.USER_LEAVE, user.id);

    eventBus.emit('user:left', {
      userId: user.id,
      username: user.name
    });

    logger.info('%s left the server', user.name);

    enqueueActivityLog({
      type: ActivityLogType.USER_LEFT,
      userId: user.id
    });
  } catch (error) {
    logger.error(
      `Error occurred while handling WebSocket close: ${getErrorMessage(error)}`
    );
  }
};

const createWsServer = async (server: http.Server) => {
  return new Promise<WebSocketServer>((resolve) => {
    wss = new WebSocketServer({ server });

    wss.on('connection', (ws) => {
      try {
        ws.userId = undefined;

        ws.on('close', () => handleSocketClose(ws));

        ws.on('error', (err) => {
          logger.error('WebSocket client error:', err);
        });
      } catch (error) {
        logger.error(
          `Error occurred while handling WebSocket connection: ${getErrorMessage(error)}`
        );
      }
    });

    wss.on('close', () => {
      logger.debug('WebSocket server closed');
    });

    wss.on('error', (err) => {
      logger.error('WebSocket server error: %s', getErrorMessage(err));
    });

    applyWSSHandler({
      wss,
      router: appRouter,
      createContext,
      keepAlive: {
        enabled: true,
        pingMs: 30_000,
        pongWaitMs: 5_000
      }
    });

    resolve(wss);
  });
};

export {
  clearUserSocketsForTests,
  createContext,
  createWsServer,
  disconnectUser,
  getOnlineUserIds,
  getUserIp,
  handleSocketClose,
  trackUserSocket
};
