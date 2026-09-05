import type { EventPayloads, ServerEvent } from '@sharkord/plugin-sdk';
import { getErrorMessage } from '@sharkord/shared';
import { logger } from '../logger';
import { EVENT_HANDLER_TIMEOUT_MS, withTimeout } from './execution-timeout';

type Handler<E extends ServerEvent> = (
  payload: EventPayloads[E]
) => void | Promise<void>;

class EventBus {
  private handlers = new Map<string, Map<ServerEvent, Set<Handler<any>>>>();

  public register = <E extends ServerEvent>(
    pluginId: string,
    event: E,
    handler: Handler<E>
  ) => {
    const pluginEvents = this.handlers.get(pluginId) ?? new Map();
    const eventHandlers = pluginEvents.get(event) ?? new Set();

    eventHandlers.add(handler);
    pluginEvents.set(event, eventHandlers);
    this.handlers.set(pluginId, pluginEvents);

    return () => {
      this.unregister(pluginId, event, handler);
    };
  };

  public unregister = <E extends ServerEvent>(
    pluginId: string,
    event: E,
    handler: Handler<E>
  ) => {
    const pluginEvents = this.handlers.get(pluginId);
    const eventHandlers = pluginEvents?.get(event);

    if (!pluginEvents || !eventHandlers) return;

    eventHandlers.delete(handler);

    if (eventHandlers.size === 0) {
      pluginEvents.delete(event);
    }

    if (pluginEvents.size === 0) {
      this.handlers.delete(pluginId);
    }
  };

  public unload = (pluginId: string) => {
    this.handlers.delete(pluginId);
  };

  private run = async <E extends ServerEvent>(
    event: E,
    payload: EventPayloads[E],
    handlers: Handler<E>[]
  ) => {
    if (handlers.length === 0) return;

    const results = await Promise.allSettled(
      handlers.map((handler) =>
        withTimeout(
          Promise.resolve().then(() => handler(payload)),
          EVENT_HANDLER_TIMEOUT_MS,
          `[eventBus] ${event} handler exceeded timeout of ${EVENT_HANDLER_TIMEOUT_MS}ms`
        )
      )
    );

    for (const result of results) {
      if (result.status === 'rejected') {
        logger.error(
          `[eventBus] ${event} handler failed: %s`,
          getErrorMessage(result.reason)
        );
      }
    }
  };

  public emit = async <E extends ServerEvent>(
    event: E,
    payload: EventPayloads[E]
  ) => {
    const handlers: Handler<E>[] = [];

    for (const pluginEvents of this.handlers.values()) {
      const eventHandlers = pluginEvents.get(event);

      if (eventHandlers) handlers.push(...eventHandlers);
    }

    return this.run(event, payload, handlers);
  };

  public emitTo = async <E extends ServerEvent>(
    pluginId: string,
    event: E,
    payload: EventPayloads[E]
  ) => {
    const eventHandlers = this.handlers.get(pluginId)?.get(event);

    return this.run(event, payload, Array.from(eventHandlers ?? []));
  };

  public clear = () => {
    this.handlers.clear();
  };

  public getListenersCount = (event: ServerEvent) => {
    let total = 0;

    for (const pluginEvents of this.handlers.values()) {
      total += pluginEvents.get(event)?.size ?? 0;
    }

    return total;
  };

  public getPluginHandlersCount = (pluginId: string, event: ServerEvent) =>
    this.handlers.get(pluginId)?.get(event)?.size ?? 0;

  public hasPlugin = (pluginId: string) => this.handlers.has(pluginId);
}

const eventBus = new EventBus();

export { eventBus, EventBus };
