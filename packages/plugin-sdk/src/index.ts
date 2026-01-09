import type { AppData, Producer, Router } from "mediasoup/types";
import type { CommandDefinition, StreamKind } from "@sharkord/shared";

export type ServerEvent =
  | "user:joined"
  | "user:left"
  | "message:created"
  | "message:updated"
  | "message:deleted"
  | "voice:runtime_initialized";

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
}

export interface PluginContext {
  path: string;

  log(...args: unknown[]): void;
  debug(...args: unknown[]): void;
  error(...args: unknown[]): void;

  events: {
    on<E extends ServerEvent>(
      event: E,
      handler: (payload: EventPayloads[E]) => void | Promise<void>
    ): void;
  };

  actions: {
    voice: {
      getRouter(channelId: number): Router<AppData>;
      addExternalProducer(
        channelId: number,
        type: StreamKind,
        producer: Producer
      ): number;
    };
  };

  commands: {
    register<TArgs = void>(command: CommandDefinition<TArgs>): void;
  };
}

export interface UnloadPluginContext
  extends Pick<PluginContext, "log" | "debug" | "error"> {}
