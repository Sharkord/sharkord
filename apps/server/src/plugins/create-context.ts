import type {
  PluginContext,
  TCreateStreamOptions,
  TExternalStreamHandle,
  TPluginHttpMethod,
  TPluginHttpRouteHandler,
  TPluginHttpRouteOptions,
  TPluginSlotRequirements,
  UnloadPluginContext,
  UpgradePluginContext
} from '@sharkord/plugin-sdk';
import {
  ServerEvents,
  StreamKind,
  type ChannelPermission,
  type Permission
} from '@sharkord/shared';
import { channelUserCan } from '../db/queries/channels';
import { getMessage } from '../db/queries/messages';
import {
  deletePluginUserData,
  getPluginUserData,
  setPluginUserData
} from '../db/queries/plugin-user-data';
import { getRole, getRoles, userCan } from '../db/queries/roles';
import { getPublicUserById, getPublicUsers } from '../db/queries/users';
import { getPluginVoiceRuntime } from '../helpers/get-plugin-voice-runtime';
import { VoiceRuntime } from '../runtimes/voice';
import { pubsub } from '../utils/pubsub';
import { consumeVoiceProducer } from './actions/consume-voice-producer';
import { createPluginMessage } from './actions/create-plugin-message';
import { deletePluginMessage } from './actions/delete-plugin-message';
import { editPluginMessage } from './actions/edit-plugin-message';
import {
  banPluginUser,
  kickPluginUser,
  unbanPluginUser
} from './actions/moderate-plugin-user';
import { setPluginMessagePinned } from './actions/pin-plugin-message';
import {
  pushToAllPluginClients,
  pushToPluginClients
} from './actions/push-to-plugin-clients';
import {
  addPluginReaction,
  removePluginReaction
} from './actions/react-plugin-message';
import {
  listPluginMessages,
  type TListPluginMessagesOptions
} from './actions/read-plugin-messages';
import {
  assignPluginUserRole,
  removePluginUserRole
} from './actions/set-plugin-user-role';
import {
  createPluginCategory,
  createPluginChannel,
  deletePluginCategory,
  deletePluginChannel,
  getPluginCategory,
  getPluginChannel,
  listPluginCategories,
  listPluginChannels,
  updatePluginCategory,
  updatePluginChannel
} from './actions/write-plugin-channels';
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
  setUiEnabled: (
    enabled: boolean,
    requirements?: TPluginSlotRequirements
  ) => void;
};

const createStream = (
  pluginId: string,
  scopedLogger: ScopedLogger,
  options: TCreateStreamOptions
): TExternalStreamHandle => {
  const channel = getPluginVoiceRuntime(options.channelId);

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
    enable: (requirements) => setUiEnabled(true, requirements),
    disable: () => setUiEnabled(false)
  },
  voice: {
    getRouter: (channelId: number) =>
      getPluginVoiceRuntime(channelId).getRouter(),
    createStream: (options: TCreateStreamOptions) =>
      createStream(pluginId, scopedLogger, options),
    getListenInfo: () => VoiceRuntime.getListenInfo(),
    getState: (channelId: number) =>
      getPluginVoiceRuntime(channelId).getState(),
    getProducers: (channelId: number) =>
      getPluginVoiceRuntime(channelId).listProducers(),
    consume: (options) => consumeVoiceProducer(pluginId, scopedLogger, options)
  },
  messages: {
    send: async (channelId, content, options) =>
      createPluginMessage({
        pluginId,
        channelId,
        content,
        parentMessageId: options?.parentMessageId,
        replyToMessageId: options?.replyToMessageId,
        files: options?.files,
        previews: options?.previews
      }),
    edit: async (messageId, content, options) =>
      editPluginMessage({
        pluginId,
        messageId,
        content,
        previews: options?.previews
      }),
    delete: async (messageId) => deletePluginMessage({ pluginId, messageId }),
    get: async (messageId: number) => getMessage(messageId),
    list: async (options: TListPluginMessagesOptions) =>
      listPluginMessages(options),
    pin: async (messageId: number) => setPluginMessagePinned(messageId, true),
    unpin: async (messageId: number) =>
      setPluginMessagePinned(messageId, false),
    react: async (messageId: number, emoji: string) =>
      addPluginReaction(pluginId, messageId, emoji),
    unreact: async (messageId: number, emoji: string) =>
      removePluginReaction(pluginId, messageId, emoji)
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
    (
      routePath: string,
      handler: TPluginHttpRouteHandler,
      options?: TPluginHttpRouteOptions
    ) =>
      registerHttpRoute(method, routePath, handler, options);

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
      get: async (roleId: number) => getRole(roleId),
      assign: async (userId: number, roleId: number) =>
        assignPluginUserRole(userId, roleId),
      remove: async (userId: number, roleId: number) =>
        removePluginUserRole(userId, roleId)
    },
    push: {
      toUser: (userId: number, data: unknown) =>
        pushToPluginClients(pluginId, [userId], data),
      toUsers: (userIds: number[], data: unknown) =>
        pushToPluginClients(pluginId, userIds, data),
      toAll: (data: unknown) => pushToAllPluginClients(pluginId, data)
    },
    userData: {
      get: async (userId: number) => getPluginUserData(pluginId, userId),
      set: async (userId: number, data: Record<string, unknown>) =>
        setPluginUserData(pluginId, userId, data),
      delete: async (userId: number) => deletePluginUserData(pluginId, userId)
    },
    users: {
      list: async () => getPublicUsers(),
      get: async (userId: number) => getPublicUserById(userId),
      ban: async (userId: number, reason?: string) =>
        banPluginUser(userId, reason),
      unban: async (userId: number) => unbanPluginUser(userId),
      kick: async (userId: number, reason?: string) =>
        kickPluginUser(userId, reason)
    },
    channels: {
      list: async () => listPluginChannels(),
      get: async (channelId: number) => getPluginChannel(channelId),
      create: async (input) => createPluginChannel(input),
      update: async (channelId, values) =>
        updatePluginChannel(channelId, values),
      delete: async (channelId) => deletePluginChannel(channelId)
    },
    categories: {
      list: async () => listPluginCategories(),
      get: async (categoryId: number) => getPluginCategory(categoryId),
      create: async (name) => createPluginCategory(name),
      update: async (categoryId, name) =>
        updatePluginCategory(categoryId, name),
      delete: async (categoryId) => deletePluginCategory(categoryId)
    }
  };
};

export { createContext, createUnloadContext, createUpgradeContext };
export type { TContextDependencies };
