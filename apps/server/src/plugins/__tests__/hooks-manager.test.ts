import {
  FileSaveType,
  MessageSaveType,
  type TBeforeFileSavePayload,
  type TBeforeMessageSavePayload
} from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import { HooksManager } from '../hooks-manager';

const payload: TBeforeFileSavePayload = {
  readBytes: async () => new Uint8Array([1, 2, 3]),
  originalName: 'cat.png',
  extension: 'png',
  size: 3,
  userId: 1,
  type: FileSaveType.MESSAGE
};

const getHandlers = (hooks: HooksManager, pluginId: string) =>
  hooks.get('beforeFileSave').find((hook) => hook.pluginId === pluginId)
    ?.handlers ?? [];

const messagePayload: TBeforeMessageSavePayload = {
  content: '<p>hi</p>',
  textContent: 'hi',
  channelId: 1,
  userId: 1,
  type: MessageSaveType.CREATE
};

const getMessageHandlers = (hooks: HooksManager, pluginId: string) =>
  hooks.get('beforeMessageSave').find((hook) => hook.pluginId === pluginId)
    ?.handlers ?? [];

describe('hooks-manager', () => {
  // the real timeout is 30s, too long to wait for here: withTimeout has its own
  // tests, so what matters is that the handlers handed out are the wrapped ones
  test('should hand out wrapped handlers rather than the registered functions', () => {
    const hooks = new HooksManager();
    const handler = async () => {};

    hooks.register('beforeFileSave', 'plugin-a', handler);

    const [wrapped] = getHandlers(hooks, 'plugin-a');

    expect(wrapped).toBeDefined();
    expect(wrapped).not.toBe(handler);
  });

  test('should forward the payload and the returned path through the wrapper', async () => {
    const hooks = new HooksManager();
    let received: TBeforeFileSavePayload | undefined;

    hooks.register('beforeFileSave', 'plugin-a', async (hookPayload) => {
      received = hookPayload;

      return { update: { originalName: 'renamed.png' } };
    });

    const [wrapped] = getHandlers(hooks, 'plugin-a');

    expect(await wrapped!(payload)).toEqual({
      update: { originalName: 'renamed.png' }
    });
    expect(received).toBe(payload);
  });

  // rejecting a file is what a hook is for, so the wrapper must not swallow it
  test('should propagate a rejection from the handler', async () => {
    const hooks = new HooksManager();

    hooks.register('beforeFileSave', 'plugin-a', async () => {
      throw new Error('rejected by plugin');
    });

    const [wrapped] = getHandlers(hooks, 'plugin-a');

    await expect(wrapped!(payload)).rejects.toThrow('rejected by plugin');
  });

  test('should propagate a synchronous throw from the handler', async () => {
    const hooks = new HooksManager();

    hooks.register('beforeFileSave', 'plugin-a', (() => {
      throw new Error('threw before returning');
    }) as never);

    const [wrapped] = getHandlers(hooks, 'plugin-a');

    await expect(wrapped!(payload)).rejects.toThrow('threw before returning');
  });

  test('should keep every handler a plugin registers, in order', async () => {
    const hooks = new HooksManager();
    const calls: string[] = [];

    hooks.register('beforeFileSave', 'plugin-a', async () => {
      calls.push('first');
    });
    hooks.register('beforeFileSave', 'plugin-a', async () => {
      calls.push('second');
    });

    for (const handler of getHandlers(hooks, 'plugin-a')) {
      await handler(payload);
    }

    expect(calls).toEqual(['first', 'second']);
  });

  test('should hand out wrapped beforeMessageSave handlers too', async () => {
    const hooks = new HooksManager();
    const handler = async () => ({ update: { content: '<p>rewritten</p>' } });

    hooks.register('beforeMessageSave', 'plugin-a', handler);

    const [wrapped] = getMessageHandlers(hooks, 'plugin-a');

    expect(wrapped).not.toBe(handler);
    expect(await wrapped!(messagePayload)).toEqual({
      update: { content: '<p>rewritten</p>' }
    });
  });

  // refusing a message is what the hook is for, so the wrapper must not swallow it
  test('should propagate a beforeMessageSave failure', async () => {
    const hooks = new HooksManager();

    hooks.register('beforeMessageSave', 'plugin-a', async () => {
      throw new Error('blocked');
    });

    const [wrapped] = getMessageHandlers(hooks, 'plugin-a');

    await expect(wrapped!(messagePayload)).rejects.toThrow('blocked');
  });

  test('should drop both hook kinds when a plugin unloads', () => {
    const hooks = new HooksManager();

    hooks.register('beforeFileSave', 'plugin-a', async () => {});
    hooks.register('beforeMessageSave', 'plugin-a', async () => {});

    hooks.unload('plugin-a');

    expect(getHandlers(hooks, 'plugin-a')).toHaveLength(0);
    expect(getMessageHandlers(hooks, 'plugin-a')).toHaveLength(0);
  });

  test('should drop only the unloaded plugin hooks', () => {
    const hooks = new HooksManager();

    hooks.register('beforeFileSave', 'plugin-a', async () => {});
    hooks.register('beforeFileSave', 'plugin-b', async () => {});

    hooks.unload('plugin-a');

    expect(getHandlers(hooks, 'plugin-a')).toHaveLength(0);
    expect(getHandlers(hooks, 'plugin-b')).toHaveLength(1);
  });
});
