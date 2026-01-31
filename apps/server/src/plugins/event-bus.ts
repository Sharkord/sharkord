import type { EventPayloads, ServerEvent } from '@sharkord/plugin-sdk';
import { logger } from '../logger';

type Handler<E extends ServerEvent> = (
  payload: EventPayloads[E]
) => void | Promise<void>;

class EventBus {
  private listeners = new Map<ServerEvent, Set<Handler<any>>>();
  private pluginHandlers = new Map<
    string,
    Map<ServerEvent, Set<Handler<any>>>
  >();

  public register = <E extends ServerEvent>(
    pluginId: string,
    event: E,
    handler: Handler<E>
  ) => {
    let handlers = this.listeners.get(event);

    if (!handlers) {
      handlers = new Set();
      this.listeners.set(event, handlers);
    }

    handlers.add(handler);

    let pluginEvents = this.pluginHandlers.get(pluginId);

    if (!pluginEvents) {
      pluginEvents = new Map();
      this.pluginHandlers.set(pluginId, pluginEvents);
    }

    let pluginEventHandlers = pluginEvents.get(event);

    if (!pluginEventHandlers) {
      pluginEventHandlers = new Set();
      pluginEvents.set(event, pluginEventHandlers);
    }

    pluginEventHandlers.add(handler);
  };

  public unload = (pluginId: string) => {
    const pluginEvents = this.pluginHandlers.get(pluginId);

    if (!pluginEvents) {
      return;
    }

    for (const [event, handlers] of pluginEvents.entries()) {
      const globalHandlers = this.listeners.get(event);

      if (globalHandlers) {
        for (const handler of handlers) {
          globalHandlers.delete(handler);
        }

        if (globalHandlers.size === 0) {
          this.listeners.delete(event);
        }
      }
    }

    this.pluginHandlers.delete(pluginId);
  };

  public on = <E extends ServerEvent>(event: E, handler: Handler<E>) => {
    let handlers = this.listeners.get(event);

    if (!handlers) {
      handlers = new Set();

      this.listeners.set(event, handlers);
    }

    handlers.add(handler);
  };

  public off = <E extends ServerEvent>(event: E, handler: Handler<E>) => {
    this.listeners.get(event)?.delete(handler);
  };

  public emit = async <E extends ServerEvent>(
    event: E,
    payload: EventPayloads[E]
  ) => {
    const handlers = this.listeners.get(event);

    if (!handlers) return;

    for (const handler of handlers) {
      try {
        await handler(payload);
      } catch (err) {
        logger.error(`[eventBus] ${event} handler failed`, err);
      }
    }
  };

  public clear = () => {
    this.listeners.clear();
    this.pluginHandlers.clear();
  };

  public getListenersCount = (event: ServerEvent) => {
    return this.listeners.get(event)?.size ?? 0;
  };

  public getPluginHandlersCount = (pluginId: string, event: ServerEvent) => {
    return this.pluginHandlers.get(pluginId)?.get(event)?.size ?? 0;
  };

  public hasPlugin = (pluginId: string) => {
    return this.pluginHandlers.has(pluginId);
  };
}

const eventBus = new EventBus();

export { eventBus, EventBus };
