import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { EventBus } from '../event-bus';

describe('event-bus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  describe('register', () => {
    test('should register a handler for a plugin', () => {
      const handler = mock(() => {});

      eventBus.register('plugin1', 'message:created', handler);

      expect(eventBus.getListenersCount('message:created')).toBe(1);
      expect(
        eventBus.getPluginHandlersCount('plugin1', 'message:created')
      ).toBe(1);
    });

    test('should register multiple handlers for the same event', () => {
      const handler1 = mock(() => {});
      const handler2 = mock(() => {});

      eventBus.register('plugin1', 'message:created', handler1);
      eventBus.register('plugin1', 'message:created', handler2);

      expect(eventBus.getListenersCount('message:created')).toBe(2);
      expect(
        eventBus.getPluginHandlersCount('plugin1', 'message:created')
      ).toBe(2);
    });

    test('should register handlers from different plugins for the same event', () => {
      const handler1 = mock(() => {});
      const handler2 = mock(() => {});

      eventBus.register('plugin1', 'message:created', handler1);
      eventBus.register('plugin2', 'message:created', handler2);

      expect(eventBus.getListenersCount('message:created')).toBe(2);
      expect(
        eventBus.getPluginHandlersCount('plugin1', 'message:created')
      ).toBe(1);
      expect(
        eventBus.getPluginHandlersCount('plugin2', 'message:created')
      ).toBe(1);
    });

    test('should register handlers for different events from the same plugin', () => {
      const handler1 = mock(() => {});
      const handler2 = mock(() => {});

      eventBus.register('plugin1', 'message:created', handler1);
      eventBus.register('plugin1', 'user:joined', handler2);

      expect(eventBus.getListenersCount('message:created')).toBe(1);
      expect(eventBus.getListenersCount('user:joined')).toBe(1);
      expect(
        eventBus.getPluginHandlersCount('plugin1', 'message:created')
      ).toBe(1);
      expect(eventBus.getPluginHandlersCount('plugin1', 'user:joined')).toBe(1);
    });
  });

  describe('unload', () => {
    test('should remove all handlers for a plugin', () => {
      const handler1 = mock(() => {});
      const handler2 = mock(() => {});

      eventBus.register('plugin1', 'message:created', handler1);
      eventBus.register('plugin1', 'user:joined', handler2);

      expect(eventBus.hasPlugin('plugin1')).toBe(true);
      expect(eventBus.getListenersCount('message:created')).toBe(1);
      expect(eventBus.getListenersCount('user:joined')).toBe(1);

      eventBus.unload('plugin1');

      expect(eventBus.hasPlugin('plugin1')).toBe(false);
      expect(eventBus.getListenersCount('message:created')).toBe(0);
      expect(eventBus.getListenersCount('user:joined')).toBe(0);
    });

    test('should only remove handlers for the specified plugin', () => {
      const handler1 = mock(() => {});
      const handler2 = mock(() => {});
      const handler3 = mock(() => {});

      eventBus.register('plugin1', 'message:created', handler1);
      eventBus.register('plugin2', 'message:created', handler2);
      eventBus.register('plugin2', 'user:joined', handler3);

      eventBus.unload('plugin1');

      expect(eventBus.hasPlugin('plugin1')).toBe(false);
      expect(eventBus.hasPlugin('plugin2')).toBe(true);
      expect(eventBus.getListenersCount('message:created')).toBe(1);
      expect(eventBus.getListenersCount('user:joined')).toBe(1);
    });

    test('should clean up empty event listener sets', () => {
      const handler = mock(() => {});

      eventBus.register('plugin1', 'message:created', handler);
      expect(eventBus.getListenersCount('message:created')).toBe(1);

      eventBus.unload('plugin1');
      expect(eventBus.getListenersCount('message:created')).toBe(0);
    });

    test('should handle unloading a non-existent plugin gracefully', () => {
      expect(() => {
        eventBus.unload('non-existent-plugin');
      }).not.toThrow();
    });

    test('should handle unloading the same plugin twice', () => {
      const handler = mock(() => {});
      eventBus.register('plugin1', 'message:created', handler);

      eventBus.unload('plugin1');
      expect(eventBus.hasPlugin('plugin1')).toBe(false);

      expect(() => {
        eventBus.unload('plugin1');
      }).not.toThrow();
    });
  });

  describe('emit', () => {
    test('should call registered handler when event is emitted', async () => {
      const handler = mock(() => {});

      eventBus.register('plugin1', 'message:created', handler);

      await eventBus.emit('message:created', {
        messageId: 1,
        channelId: 2,
        userId: 3,
        content: 'test message'
      });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({
        messageId: 1,
        channelId: 2,
        userId: 3,
        content: 'test message'
      });
    });

    test('should call multiple handlers for the same event', async () => {
      const handler1 = mock(() => {});
      const handler2 = mock(() => {});

      eventBus.register('plugin1', 'message:created', handler1);
      eventBus.register('plugin2', 'message:created', handler2);

      await eventBus.emit('message:created', {
        messageId: 1,
        channelId: 2,
        userId: 3,
        content: 'test'
      });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    test('should not call handler after plugin is unloaded', async () => {
      const handler = mock(() => {});

      eventBus.register('plugin1', 'message:created', handler);

      await eventBus.emit('message:created', {
        messageId: 1,
        channelId: 2,
        userId: 3,
        content: 'test'
      });

      expect(handler).toHaveBeenCalledTimes(1);

      eventBus.unload('plugin1');

      await eventBus.emit('message:created', {
        messageId: 2,
        channelId: 2,
        userId: 3,
        content: 'test2'
      });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    test('should handle async handlers', async () => {
      const handler = mock(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      eventBus.register('plugin1', 'user:joined', handler);

      await eventBus.emit('user:joined', {
        userId: 1,
        username: 'testuser'
      });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    test('should not throw when emitting event with no handlers', async () => {
      await expect(
        eventBus.emit('message:created', {
          messageId: 1,
          channelId: 2,
          userId: 3,
          content: 'test'
        })
      ).resolves.toBeUndefined();
    });

    test('should continue calling other handlers if one throws', async () => {
      const handler1 = mock(() => {
        throw new Error('Handler 1 error');
      });
      const handler2 = mock(() => {});

      eventBus.register('plugin1', 'message:created', handler1);
      eventBus.register('plugin2', 'message:created', handler2);

      await eventBus.emit('message:created', {
        messageId: 1,
        channelId: 2,
        userId: 3,
        content: 'test'
      });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });

  describe('on and off', () => {
    test('should register handler with on method', async () => {
      const handler = mock(() => {});

      eventBus.on('message:created', handler);

      await eventBus.emit('message:created', {
        messageId: 1,
        channelId: 2,
        userId: 3,
        content: 'test'
      });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    test('should remove handler with off method', async () => {
      const handler = mock(() => {});

      eventBus.on('message:created', handler);

      await eventBus.emit('message:created', {
        messageId: 1,
        channelId: 2,
        userId: 3,
        content: 'test'
      });

      expect(handler).toHaveBeenCalledTimes(1);

      eventBus.off('message:created', handler);

      await eventBus.emit('message:created', {
        messageId: 2,
        channelId: 2,
        userId: 3,
        content: 'test2'
      });

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('clear', () => {
    test('should remove all listeners and plugin handlers', () => {
      const handler1 = mock(() => {});
      const handler2 = mock(() => {});
      const handler3 = mock(() => {});

      eventBus.register('plugin1', 'message:created', handler1);
      eventBus.register('plugin2', 'user:joined', handler2);
      eventBus.on('message:deleted', handler3);

      expect(eventBus.getListenersCount('message:created')).toBe(1);
      expect(eventBus.getListenersCount('user:joined')).toBe(1);
      expect(eventBus.getListenersCount('message:deleted')).toBe(1);

      eventBus.clear();

      expect(eventBus.getListenersCount('message:created')).toBe(0);
      expect(eventBus.getListenersCount('user:joined')).toBe(0);
      expect(eventBus.getListenersCount('message:deleted')).toBe(0);
      expect(eventBus.hasPlugin('plugin1')).toBe(false);
      expect(eventBus.hasPlugin('plugin2')).toBe(false);
    });
  });

  describe('complex scenarios', () => {
    test('should handle plugin reload (unload + register)', async () => {
      const handler1 = mock(() => {});
      const handler2 = mock(() => {});

      eventBus.register('plugin1', 'message:created', handler1);

      await eventBus.emit('message:created', {
        messageId: 1,
        channelId: 2,
        userId: 3,
        content: 'test'
      });

      expect(handler1).toHaveBeenCalledTimes(1);

      eventBus.unload('plugin1');

      eventBus.register('plugin1', 'message:created', handler2);

      await eventBus.emit('message:created', {
        messageId: 2,
        channelId: 2,
        userId: 3,
        content: 'test2'
      });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    test('should handle multiple plugins with multiple events', async () => {
      const plugin1Handler1 = mock(() => {});
      const plugin1Handler2 = mock(() => {});
      const plugin2Handler1 = mock(() => {});
      const plugin2Handler2 = mock(() => {});

      eventBus.register('plugin1', 'message:created', plugin1Handler1);
      eventBus.register('plugin1', 'user:joined', plugin1Handler2);
      eventBus.register('plugin2', 'message:created', plugin2Handler1);
      eventBus.register('plugin2', 'message:deleted', plugin2Handler2);

      await eventBus.emit('message:created', {
        messageId: 1,
        channelId: 2,
        userId: 3,
        content: 'test'
      });

      expect(plugin1Handler1).toHaveBeenCalledTimes(1);
      expect(plugin2Handler1).toHaveBeenCalledTimes(1);
      expect(plugin1Handler2).toHaveBeenCalledTimes(0);
      expect(plugin2Handler2).toHaveBeenCalledTimes(0);

      eventBus.unload('plugin1');

      await eventBus.emit('message:created', {
        messageId: 2,
        channelId: 2,
        userId: 3,
        content: 'test2'
      });

      expect(plugin1Handler1).toHaveBeenCalledTimes(1);
      expect(plugin2Handler1).toHaveBeenCalledTimes(2);
    });
  });
});
