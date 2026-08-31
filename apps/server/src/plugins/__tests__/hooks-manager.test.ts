import { FileSaveType, type TBeforeFileSavePayload } from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import { HooksManager } from '../hooks-manager';

const payload = {
  tempFile: { id: 'temp-1' },
  userId: 1,
  type: FileSaveType.MESSAGE
} as unknown as TBeforeFileSavePayload;

const getHandlers = (hooks: HooksManager, pluginId: string) =>
  hooks.getBeforeFileSaveHooks().find((hook) => hook.pluginId === pluginId)
    ?.handlers ?? [];

describe('hooks-manager', () => {
  // the real timeout is 30s, too long to wait for here: withTimeout has its own
  // tests, so what matters is that the handlers handed out are the wrapped ones
  test('should hand out wrapped handlers rather than the registered functions', () => {
    const hooks = new HooksManager();
    const handler = async () => {};

    hooks.registerBeforeFileSave('plugin-a', handler);

    const [wrapped] = getHandlers(hooks, 'plugin-a');

    expect(wrapped).toBeDefined();
    expect(wrapped).not.toBe(handler);
  });

  test('should forward the payload and the returned path through the wrapper', async () => {
    const hooks = new HooksManager();
    let received: TBeforeFileSavePayload | undefined;

    hooks.registerBeforeFileSave('plugin-a', async (hookPayload) => {
      received = hookPayload;

      return '/tmp/replacement.txt';
    });

    const [wrapped] = getHandlers(hooks, 'plugin-a');

    expect(await wrapped!(payload)).toBe('/tmp/replacement.txt');
    expect(received).toBe(payload);
  });

  // rejecting a file is what a hook is for, so the wrapper must not swallow it
  test('should propagate a rejection from the handler', async () => {
    const hooks = new HooksManager();

    hooks.registerBeforeFileSave('plugin-a', async () => {
      throw new Error('rejected by plugin');
    });

    const [wrapped] = getHandlers(hooks, 'plugin-a');

    await expect(wrapped!(payload)).rejects.toThrow('rejected by plugin');
  });

  test('should propagate a synchronous throw from the handler', async () => {
    const hooks = new HooksManager();

    hooks.registerBeforeFileSave('plugin-a', (() => {
      throw new Error('threw before returning');
    }) as never);

    const [wrapped] = getHandlers(hooks, 'plugin-a');

    await expect(wrapped!(payload)).rejects.toThrow('threw before returning');
  });

  test('should keep every handler a plugin registers, in order', async () => {
    const hooks = new HooksManager();
    const calls: string[] = [];

    hooks.registerBeforeFileSave('plugin-a', async () => {
      calls.push('first');
    });
    hooks.registerBeforeFileSave('plugin-a', async () => {
      calls.push('second');
    });

    for (const handler of getHandlers(hooks, 'plugin-a')) {
      await handler(payload);
    }

    expect(calls).toEqual(['first', 'second']);
  });

  test('should drop only the unloaded plugin hooks', () => {
    const hooks = new HooksManager();

    hooks.registerBeforeFileSave('plugin-a', async () => {});
    hooks.registerBeforeFileSave('plugin-b', async () => {});

    hooks.unload('plugin-a');

    expect(getHandlers(hooks, 'plugin-a')).toHaveLength(0);
    expect(getHandlers(hooks, 'plugin-b')).toHaveLength(1);
  });
});
