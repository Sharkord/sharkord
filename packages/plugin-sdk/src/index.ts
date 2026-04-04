import type {
  ActionDefinition,
  CommandDefinition,
  TActionContract,
  TBeforeFileSaveHook,
  TCommandArg,
  TCommandContract,
  TInvokerContext,
  TPluginActions,
  TPluginComponentsMapBySlotId,
  TPluginSettingDefinition,
  TPluginStore,
  TPluginStoreState
} from '@sharkord/shared';
import { FileSaveType, PLUGIN_SDK_VERSION, PluginSlot } from '@sharkord/shared';
import type { AppData, Producer, Router } from 'mediasoup/types';

export type TCreateStreamOptions = {
  channelId: number;
  title: string;
  key: string;
  avatarUrl?: string;
  producers: {
    audio?: Producer;
    video?: Producer;
  };
};

export type TExternalStreamHandle = {
  streamId: number;
  remove: () => void;
  update: (options: {
    title?: string;
    avatarUrl?: string;
    producers?: {
      audio?: Producer;
      video?: Producer;
    };
  }) => void;
};

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
  | 'setting:set';

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
    pluginId: string | null;
    content: string;
    textContent: string;
  };
  'message:deleted': {
    messageId: number;
    channelId: number;
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
  pluginId: string;

  logger: {
    log(...args: unknown[]): void;
    debug(...args: unknown[]): void;
    error(...args: unknown[]): void;
  };

  log(...args: unknown[]): void;
  debug(...args: unknown[]): void;
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
      }
    ): Promise<{ messageId: number }>;
    edit(messageId: number, content: string): Promise<void>;
    delete(messageId: number): Promise<void>;
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
  };

  data: {
    getUser(userId: number): Promise<unknown | undefined>;
    getChannel(channelId: number): Promise<unknown | undefined>;
    getPublicUsers(): Promise<unknown[]>;
  };

  ui: {
    enable(): void;
    disable(): void;
  };
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface UnloadPluginContext extends Pick<
  PluginContext,
  'path' | 'logger' | 'log' | 'debug' | 'error' | 'voice' | 'messages' | 'ui'
> {}

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
  TBeforeFileSaveHook,
  TCommandArg,
  TCommandContract,
  TInvokerContext,
  TPluginActions,
  TPluginComponentsMapBySlotId,
  TPluginStore,
  TPluginStoreState,
  TSharkordState
};

export * from './actions';
export * from './commands';
export { FileSaveType, PLUGIN_SDK_VERSION, PluginSlot };
