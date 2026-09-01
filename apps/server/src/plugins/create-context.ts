import type {
  PluginContext,
  TCreateStreamOptions,
  TExternalStreamHandle,
  TPluginHttpMethod,
  TPluginHttpRouteHandler,
  UnloadPluginContext,
  UpgradePluginContext
} from '@sharkord/plugin-sdk';
import {
  ServerEvents,
  StreamKind,
  type ChannelPermission,
  type Permission
} from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { channelUserCan } from '../db/queries/channels';
import { getMessage } from '../db/queries/messages';
import { getRoles, userCan } from '../db/queries/roles';
import { getPublicUserById, getPublicUsers } from '../db/queries/users';
import { channels } from '../db/schema';
import { VoiceRuntime } from '../runtimes/voice';
import { pubsub } from '../utils/pubsub';
import { createPluginMessage } from './actions/create-plugin-message';
import { deletePluginMessage } from './actions/delete-plugin-message';
import { editPluginMessage } from './actions/edit-plugin-message';
import {
  listPluginMessages,
  type TListPluginMessagesOptions
} from './actions/read-plugin-messages';
import {
  assignPluginUserRole,
  removePluginUserRole
} from './actions/set-plugin-user-role';
import { eventBus } from './event-bus';
import type { ScopedLogger } from './plugin-logger';

type TContextDependencies = {
  pluginId: string;
  dataPath: string;
  scopedLogger: ScopedLogger;
  pluginPath: string;
  registerAction: PluginContext['actions']['register'];
  registerCommand: PluginContext['commands']['register'];
  registerSettings: PluginContext['settings']['register'];
  registerBeforeFileSave: PluginContext['hooks']['onBeforeFileSave'];
  registerBeforeMessageSave: PluginContext['hooks']['onBeforeMessageSave'];
  registerBeforeChannelCreate: PluginContext['hooks']['onBeforeChannelCreate'];
  registerBeforeVoiceJoin: PluginContext['hooks']['onBeforeVoiceJoin'];
  registerBeforeLogin: PluginContext['hooks']['onBeforeLogin'];
  registerHttpRoute: PluginContext['http']['register'];
  setUiEnabled: (enabled: boolean) => void;
};

const getVoiceRuntime = (channelId: number) => {
  const channel = VoiceRuntime.findById(channelId);

  if (!channel) {
    throw new Error(`Voice runtime not found for channel ID ${channelId}`);
  }

  return channel;
};

const createStream = (
  pluginId: string,
  scopedLogger: ScopedLogger,
  options: TCreateStreamOptions
): TExternalStreamHandle => {
  const channel = getVoiceRuntime(options.channelId);

  const streamId = channel.createExternalStream({
    title: options.title,
    key: options.key,
    pluginId,
    avatarUrl: options.avatarUrl,
    bannerUrl: options.bannerUrl,
    producers: options.producers,
    videoLayers: options.videoLayers
  });

  const stream = channel.getState().externalStreams[streamId]!;

  pubsub.publish(ServerEvents.VOICE_ADD_EXTERNAL_STREAM, {
    channelId: options.channelId,
    streamId,
    stream
  });

  for (const [kind, producer] of [
    [StreamKind.EXTERNAL_AUDIO, options.producers.audio],
    [StreamKind.EXTERNAL_VIDEO, options.producers.video]
  ] as const) {
    if (!producer) continue;

    pubsub.publishForChannel(
      options.channelId,
      ServerEvents.VOICE_NEW_PRODUCER,
      { channelId: options.channelId, remoteId: streamId, kind }
    );
  }

  const label = `'${options.title}' (key: ${options.key}, id: ${streamId})`;

  scopedLogger.debug(
    `Created external stream ${label} with tracks: audio=${!!options.producers.audio}, video=${!!options.producers.video}`
  );

  return {
    streamId,
    remove: () => {
      channel.removeExternalStream(streamId);

      scopedLogger.debug(`Removed external stream ${label}`);
    },
    update: (updateOptions) => {
      channel.updateExternalStream(streamId, updateOptions);

      scopedLogger.debug(`Updated external stream ${label}`);
    }
  };
};

const createUnloadContext = ({
  pluginId,
  scopedLogger,
  pluginPath,
  dataPath,
  setUiEnabled
}: Pick<
  TContextDependencies,
  'pluginId' | 'scopedLogger' | 'pluginPath' | 'dataPath' | 'setUiEnabled'
>): UnloadPluginContext => ({
  path: pluginPath,
  dataPath,
  logger: scopedLogger,
  // TODO: deprecate this in favor of ctx.logger.* (e.g. ctx.logger.debug)
  // deprecated flat aliases (ctx.log / ctx.debug / ctx.error), kept so existing
  // plugins keep working. ctx.logger.* is the supported form
  ...scopedLogger,
  ui: {
    enable: () => setUiEnabled(true),
    disable: () => setUiEnabled(false)
  },
  voice: {
    getRouter: (channelId: number) => getVoiceRuntime(channelId).getRouter(),
    createStream: (options: TCreateStreamOptions) =>
      createStream(pluginId, scopedLogger, options),
    getListenInfo: () => VoiceRuntime.getListenInfo()
  },
  messages: {
    send: async (channelId, content, options) =>
      createPluginMessage({
        pluginId,
        channelId,
        content,
        parentMessageId: options?.parentMessageId,
        replyToMessageId: options?.replyToMessageId
      }),
    edit: async (messageId, content) =>
      editPluginMessage({ pluginId, messageId, content }),
    delete: async (messageId) => deletePluginMessage({ pluginId, messageId }),
    get: async (messageId: number) => getMessage(messageId),
    list: async (options: TListPluginMessagesOptions) =>
      listPluginMessages(options)
  }
});

const createUpgradeContext = ({
  pluginId,
  scopedLogger,
  pluginPath,
  dataPath
}: Pick<
  TContextDependencies,
  'pluginId' | 'scopedLogger' | 'pluginPath' | 'dataPath'
>): UpgradePluginContext => ({
  pluginId,
  path: pluginPath,
  dataPath,
  logger: scopedLogger,
  ...scopedLogger
});

const createContext = (deps: TContextDependencies): PluginContext => {
  const { pluginId, registerHttpRoute } = deps;

  const bindHttpMethod =
    (method: TPluginHttpMethod) =>
    (routePath: string, handler: TPluginHttpRouteHandler) =>
      registerHttpRoute(method, routePath, handler);

  return {
    pluginId,
    ...createUnloadContext(deps),
    events: {
      on: (event, handler) => eventBus.register(pluginId, event, handler),
      off: (event, handler) => eventBus.unregister(pluginId, event, handler)
    },
    actions: { register: deps.registerAction },
    commands: { register: deps.registerCommand },
    settings: { register: deps.registerSettings },
    hooks: {
      onBeforeFileSave: deps.registerBeforeFileSave,
      onBeforeMessageSave: deps.registerBeforeMessageSave,
      onBeforeChannelCreate: deps.registerBeforeChannelCreate,
      onBeforeVoiceJoin: deps.registerBeforeVoiceJoin,
      onBeforeLogin: deps.registerBeforeLogin
    },
    http: {
      register: registerHttpRoute,
      get: bindHttpMethod('GET'),
      post: bindHttpMethod('POST'),
      patch: bindHttpMethod('PATCH'),
      delete: bindHttpMethod('DELETE'),
      options: bindHttpMethod('OPTIONS')
    },
    permissions: {
      userCan: async (userId: number, permission: Permission) =>
        userCan(userId, permission),
      userCanInChannel: async (
        userId: number,
        channelId: number,
        permission: ChannelPermission
      ) => channelUserCan(channelId, userId, permission)
    },
    roles: {
      list: async () => getRoles(),
      assign: async (userId: number, roleId: number) =>
        assignPluginUserRole(userId, roleId),
      remove: async (userId: number, roleId: number) =>
        removePluginUserRole(userId, roleId)
    },
    data: {
      getUser: async (userId: number) => getPublicUserById(userId),
      getChannel: async (channelId: number) =>
        db.select().from(channels).where(eq(channels.id, channelId)).get(),
      getPublicUsers: async () => getPublicUsers()
    }
  };
};

export { createContext, createUnloadContext, createUpgradeContext };
export type { TContextDependencies };
