import type { AppData, Producer, Router } from "mediasoup/types";
import type {
  CommandDefinition,
  TInvokerContext,
  TPluginSettingDefinition,
} from "@sharkord/shared";

export type { TInvokerContext };

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
  | "user:joined"
  | "user:left"
  | "message:created"
  | "message:updated"
  | "message:deleted"
  | "voice:runtime_initialized"
  | "voice:runtime_closed";

export interface EventPayloads {
  "user:joined": {
    userId: number;
    username: string;
  };
  "user:left": {
    userId: number;
    username: string;
  };
  "message:created": {
    messageId: number;
    channelId: number;
    userId: number;
    content: string;
  };
  "message:updated": {
    messageId: number;
    channelId: number;
    userId: number;
    content: string;
  };
  "message:deleted": {
    messageId: number;
    channelId: number;
  };
  "voice:runtime_initialized": {
    channelId: number;
  };
  "voice:runtime_closed": {
    channelId: number;
  };
}

// this API is probably going to change a lot in the future
// so consider it as experimental for now

type SettingValueType<T extends TPluginSettingDefinition> =
  T["type"] extends "string"
    ? string
    : T["type"] extends "number"
      ? number
      : T["type"] extends "boolean"
        ? boolean
        : unknown;

export interface PluginSettings<
  T extends readonly TPluginSettingDefinition[] = TPluginSettingDefinition[],
> {
  get<K extends T[number]["key"]>(
    key: K,
  ): SettingValueType<Extract<T[number], { key: K }>>;
  set<K extends T[number]["key"]>(
    key: K,
    value: SettingValueType<Extract<T[number], { key: K }>>,
  ): void;
}

export interface PluginContext {
  path: string;

  log(...args: unknown[]): void;
  debug(...args: unknown[]): void;
  error(...args: unknown[]): void;

  events: {
    on<E extends ServerEvent>(
      event: E,
      handler: (payload: EventPayloads[E]) => void | Promise<void>,
    ): void;
  };

  actions: {
    voice: {
      getRouter(channelId: number): Router<AppData>;
      createStream(options: TCreateStreamOptions): TExternalStreamHandle;
      getListenInfo(): {
        ip: string;
        announcedAddress: string | undefined;
      };
    };
  };

  commands: {
    register<TArgs = void>(command: CommandDefinition<TArgs>): void;
  };

  settings: {
    register<T extends readonly TPluginSettingDefinition[]>(
      definitions: T,
    ): Promise<PluginSettings<T>>;
  };
}

export interface UnloadPluginContext
  extends Pick<PluginContext, "log" | "debug" | "error"> {}

// re-export mediasoup types for plugin usage
export type {
  AppData,
  Producer,
  Router,
  Transport,
  PlainTransport,
  PlainTransportOptions,
  ProducerOptions,
  RtpCodecCapability,
  RtpParameters,
  RtpEncodingParameters,
  MediaKind,
} from "mediasoup/types";
