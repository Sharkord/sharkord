import type {
  ActionDefinition,
  CommandDefinition,
  TActionContract,
  TBeforeChannelCreateHook,
  TBeforeFileSaveHook,
  TBeforeLoginHook,
  TBeforeMessageSaveHook,
  TBeforeVoiceJoinHook,
  TCategory,
  TChannel,
  TCommandArg,
  TCommandContract,
  TInvokerContext,
  TJoinedMessage,
  TJoinedPublicUser,
  TJoinedRole,
  TPluginActions,
  TPluginComponentsMapBySlotId,
  TPluginSettingDefinition,
  TPluginSlotRequirements,
  TPluginStore,
  TPluginStoreState,
  TPluginTab,
  TPluginTabs,
  TStreamQualityLayer
} from '@sharkord/shared';
import {
  ChannelPermission,
  ChannelType,
  FileSaveType,
  MessageSaveType,
  Permission,
  PLUGIN_SDK_VERSION,
  PluginSlot
} from '@sharkord/shared';
import type { IncomingMessage, ServerResponse } from 'http';
import type { AppData, Producer, Router } from 'mediasoup/types';

export type TCreateStreamOptions = {
  channelId: number;
  title: string;
  key: string;
  avatarUrl?: string;
  bannerUrl?: string;
  producers: {
    audio?: Producer;
    video?: Producer;
  };
  videoLayers?: TStreamQualityLayer[];
};

export type TExternalStreamHandle = {
  streamId: number;
  remove: () => void;
  update: (options: {
    title?: string;
    avatarUrl?: string;
    bannerUrl?: string;
    producers?: {
      audio?: Producer;
      video?: Producer;
    };
    videoLayers?: TStreamQualityLayer[];
  }) => void;
};

export type TPluginHttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'OPTIONS';

export type TPluginHttpRouteOptions = {
  auth?: boolean;
  requires?: Permission;
};

export type TPluginHttpRouteContext = {
  userId?: number;
};

export type TPluginHttpRouteHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  ctx: TPluginHttpRouteContext
) => Promise<unknown> | unknown;

export type ServerEvent =
  | 'user:joined'
  | 'user:left'
  | 'user:joined_voice'
  | 'user:left_voice'
  | 'message:created'
  | 'message:updated'
  | 'message:deleted'
  | 'voice:runtime_initialized'
  | 'voice:runtime_closed'
  | 'setting:set'
  | 'reaction:added'
  | 'reaction:removed'
  | 'message:pinned'
  | 'message:unpinned'
  | 'user:banned'
  | 'user:unbanned'
  | 'user:kicked'
  | 'user:created'
  | 'user:deleted'
  | 'role:assigned'
  | 'role:removed'
  | 'channel:created'
  | 'channel:updated'
  | 'channel:deleted'
  | 'category:created'
  | 'category:updated'
  | 'category:deleted'
  | 'role:created'
  | 'role:updated'
  | 'role:deleted'
  | 'user:updated';

export interface EventPayloads {
  'user:joined': {
    userId: number;
    username: string;
  };
  'user:left': {
    userId: number;
    username: string;
  };
  'user:joined_voice': {
    userId: number;
    channelId: number;
  };
  'user:left_voice': {
    userId: number;
    channelId: number;
  };
  'message:created': {
    messageId: number;
    channelId: number;
    userId: number | null;
    pluginId: string | null;
    content: string;
    textContent: string;
  };
  'message:updated': {
    messageId: number;
    channelId: number;
    userId: number | null;
    editedBy: number | null;
    pluginId: string | null;
    content: string;
    textContent: string;
  };
  'message:deleted': {
    messageId: number;
    channelId: number;
  };
  'reaction:added': {
    messageId: number;
    channelId: number;
    userId?: number;
    pluginId?: string;
    emoji: string;
  };
  'reaction:removed': {
    messageId: number;
    channelId: number;
    userId?: number;
    pluginId?: string;
    emoji: string;
  };
  'message:pinned': {
    messageId: number;
    channelId: number;
    userId?: number;
  };
  'message:unpinned': {
    messageId: number;
    channelId: number;
    userId?: number;
  };
  'user:banned': {
    userId: number;
    reason?: string;
    actorUserId?: number;
  };
  'user:unbanned': {
    userId: number;
    actorUserId?: number;
  };
  'user:kicked': {
    userId: number;
    reason?: string;
    actorUserId?: number;
  };
  'user:created': {
    userId: number;
    username: string;
  };
  'user:deleted': {
    userId: number;
  };
  'role:assigned': {
    userId: number;
    roleId: number;
  };
  'role:removed': {
    userId: number;
    roleId: number;
  };
  'channel:created': {
    channelId: number;
    name: string;
    type: string;
    categoryId: number | null;
  };
  'channel:updated': {
    channelId: number;
    name: string;
    type: string;
    categoryId: number | null;
  };
  'channel:deleted': {
    channelId: number;
    name: string;
  };
  'category:created': {
    categoryId: number;
    name: string;
  };
  'category:updated': {
    categoryId: number;
    name: string;
  };
  'category:deleted': {
    categoryId: number;
    name: string;
  };
  'role:created': {
    roleId: number;
    name: string;
  };
  'role:updated': {
    roleId: number;
    name: string;
  };
  'role:deleted': {
    roleId: number;
    name: string;
  };
  'user:updated': {
    userId: number;
    username: string;
  };
  'voice:runtime_initialized': {
    channelId: number;
  };
  'voice:runtime_closed': {
    channelId: number;
  };
  'setting:set': {
    key: string;
    value: unknown;
  };
}

// this API is probably going to change a lot in the future
// so consider it as experimental for now

type SettingValueType<T extends TPluginSettingDefinition> =
  T['type'] extends 'string'
    ? string
    : T['type'] extends 'number'
      ? number
      : T['type'] extends 'boolean'
        ? boolean
        : unknown;

export interface PluginSettings<
  T extends readonly TPluginSettingDefinition[] = TPluginSettingDefinition[]
> {
  get<K extends T[number]['key']>(
    key: K
  ): SettingValueType<Extract<T[number], { key: K }>>;
  set<K extends T[number]['key']>(
    key: K,
    value: SettingValueType<Extract<T[number], { key: K }>>
  ): void;
}

export interface PluginContext {
  path: string;
  dataPath: string;
  pluginId: string;

  logger: {
    log(...args: unknown[]): void;
    debug(...args: unknown[]): void;
    error(...args: unknown[]): void;
  };

  /** @deprecated use ctx.logger.log instead */
  log(...args: unknown[]): void;
  /** @deprecated use ctx.logger.debug instead */
  debug(...args: unknown[]): void;
  /** @deprecated use ctx.logger.error instead */
  error(...args: unknown[]): void;

  events: {
    on<E extends ServerEvent>(
      event: E,
      handler: (payload: EventPayloads[E]) => void | Promise<void>
    ): () => void;
    off<E extends ServerEvent>(
      event: E,
      handler: (payload: EventPayloads[E]) => void | Promise<void>
    ): void;
  };

  actions: {
    register<TPayload = void>(action: ActionDefinition<TPayload>): void;
  };

  voice: {
    getRouter(channelId: number): Router<AppData>;
    createStream(options: TCreateStreamOptions): TExternalStreamHandle;
    getListenInfo(): {
      ip: string;
      announcedAddress: string | undefined;
    };
  };

  messages: {
    send(
      channelId: number,
      content: string,
      options?: {
        parentMessageId?: number; // used for threads
        replyToMessageId?: number; // used for inline replies
        files?: { name: string; data: Uint8Array }[];
      }
    ): Promise<{ messageId: number }>;
    edit(messageId: number, content: string): Promise<void>;
    delete(messageId: number): Promise<void>;
    get(messageId: number): Promise<TJoinedMessage | undefined>;
    pin(messageId: number): Promise<void>;
    unpin(messageId: number): Promise<void>;
    react(messageId: number, emoji: string): Promise<void>;
    unreact(messageId: number, emoji: string): Promise<void>;
    list(options: {
      channelId: number;
      limit?: number;
      before?: number;
      parentMessageId?: number;
    }): Promise<TJoinedMessage[]>;
  };

  commands: {
    register<TArgs = void>(command: CommandDefinition<TArgs>): void;
  };

  settings: {
    register<T extends readonly TPluginSettingDefinition[]>(
      definitions: T
    ): Promise<PluginSettings<T>>;
  };

  hooks: {
    onBeforeFileSave(handler: TBeforeFileSaveHook): void;
    onBeforeMessageSave(handler: TBeforeMessageSaveHook): void;
    onBeforeChannelCreate(handler: TBeforeChannelCreateHook): void;
    onBeforeVoiceJoin(handler: TBeforeVoiceJoinHook): void;
    onBeforeLogin(handler: TBeforeLoginHook): void;
  };

  http: {
    register(
      method: TPluginHttpMethod,
      path: string,
      handler: TPluginHttpRouteHandler,
      options?: TPluginHttpRouteOptions
    ): void;
    get(
      path: string,
      handler: TPluginHttpRouteHandler,
      options?: TPluginHttpRouteOptions
    ): void;
    post(
      path: string,
      handler: TPluginHttpRouteHandler,
      options?: TPluginHttpRouteOptions
    ): void;
    patch(
      path: string,
      handler: TPluginHttpRouteHandler,
      options?: TPluginHttpRouteOptions
    ): void;
    delete(
      path: string,
      handler: TPluginHttpRouteHandler,
      options?: TPluginHttpRouteOptions
    ): void;
    options(
      path: string,
      handler: TPluginHttpRouteHandler,
      options?: TPluginHttpRouteOptions
    ): void;
  };

  permissions: {
    userCan(userId: number, permission: Permission): Promise<boolean>;
    userCanInChannel(
      userId: number,
      channelId: number,
      permission: ChannelPermission
    ): Promise<boolean>;
  };

  roles: {
    list(): Promise<TJoinedRole[]>;
    get(roleId: number): Promise<TJoinedRole | undefined>;
    assign(userId: number, roleId: number): Promise<void>;
    remove(userId: number, roleId: number): Promise<void>;
  };

  push: {
    toUser(userId: number, data: unknown): void;
    toUsers(userIds: number[], data: unknown): void;
    toAll(data: unknown): void;
  };

  userData: {
    get(userId: number): Promise<Record<string, unknown>>;
    set(userId: number, data: Record<string, unknown>): Promise<void>;
    delete(userId: number): Promise<void>;
  };

  users: {
    list(): Promise<TJoinedPublicUser[]>;
    get(userId: number): Promise<TJoinedPublicUser | undefined>;
    ban(userId: number, reason?: string): Promise<void>;
    unban(userId: number): Promise<void>;
    kick(userId: number, reason?: string): Promise<void>;
  };

  channels: {
    list(): Promise<TChannel[]>;
    get(channelId: number): Promise<TChannel | undefined>;
    create(input: {
      name: string;
      type: ChannelType;
      categoryId: number;
      private?: boolean;
    }): Promise<TChannel>;
    update(
      channelId: number,
      values: { name?: string; topic?: string | null; private?: boolean }
    ): Promise<void>;
    delete(channelId: number): Promise<void>;
  };

  categories: {
    list(): Promise<TCategory[]>;
    get(categoryId: number): Promise<TCategory | undefined>;
    create(name: string): Promise<TCategory>;
    update(categoryId: number, name: string): Promise<void>;
    delete(categoryId: number): Promise<void>;
  };

  ui: {
    enable(requirements?: TPluginSlotRequirements): void;
    disable(): void;
  };
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface UnloadPluginContext extends Pick<
  PluginContext,
  | 'path'
  | 'dataPath'
  | 'logger'
  | 'log'
  | 'debug'
  | 'error'
  | 'voice'
  | 'messages'
  | 'ui'
> {}

export type TUpgradeInfo = {
  previousVersion: string;
  version: string;
};

export type UpgradePluginContext = Pick<
  PluginContext,
  'pluginId' | 'path' | 'dataPath' | 'logger' | 'log' | 'debug' | 'error'
>;

export type PluginModule = {
  onLoad: (ctx: PluginContext) => void | Promise<void>;
  onUnload?: (ctx: UnloadPluginContext) => void | Promise<void>;
  onUpgrade?: (
    ctx: UpgradePluginContext,
    info: TUpgradeInfo
  ) => void | Promise<void>;
};

type TSharkordState = ReturnType<TPluginStore['getState']>;

// re-export mediasoup types for plugin usage
export type {
  AppData,
  MediaKind,
  PlainTransport,
  PlainTransportOptions,
  Producer,
  ProducerOptions,
  Router,
  RtpCodecCapability,
  RtpEncodingParameters,
  RtpParameters,
  Transport
} from 'mediasoup/types';

export type {
  ActionDefinition,
  CommandDefinition,
  TActionContract,
  TBeforeChannelCreateHook,
  TBeforeFileSaveHook,
  TBeforeLoginHook,
  TBeforeMessageSaveHook,
  TBeforeVoiceJoinHook,
  TCategory,
  TChannel,
  TCommandArg,
  TCommandContract,
  TInvokerContext,
  TPluginActions,
  TPluginComponentsMapBySlotId,
  TPluginSlotRequirements,
  TPluginStore,
  TPluginStoreState,
  TPluginTab,
  TPluginTabs,
  TSharkordState
};

export * from './actions';
export * from './commands';
export {
  ChannelPermission,
  ChannelType,
  FileSaveType,
  MessageSaveType,
  Permission,
  PLUGIN_SDK_VERSION,
  PluginSlot
};
