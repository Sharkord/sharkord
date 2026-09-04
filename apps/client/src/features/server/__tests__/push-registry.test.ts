import { describe, expect, test } from 'bun:test';
import { dispatchPluginPush, onPluginPush } from '../plugins/push-registry';

describe('plugin push registry', () => {
  test('should deliver to a plugin handler', () => {
    const received: unknown[] = [];
    const off = onPluginPush('plugin-a', (data) => received.push(data));

    dispatchPluginPush('plugin-a', { note: 'hi' });

    expect(received).toEqual([{ note: 'hi' }]);

    off();
  });

  test('should keep plugins apart', () => {
    const received: unknown[] = [];
    const off = onPluginPush('plugin-a', (data) => received.push(data));

    dispatchPluginPush('plugin-b', { note: 'not yours' });

    expect(received).toEqual([]);

    off();
  });

  test('should stop delivering once unsubscribed', () => {
    const received: unknown[] = [];
    const off = onPluginPush('plugin-a', (data) => received.push(data));

    off();
    dispatchPluginPush('plugin-a', { note: 'hi' });

    expect(received).toEqual([]);
  });

  test('should deliver to every handler of one plugin', () => {
    const seen: string[] = [];
    const offOne = onPluginPush('plugin-a', () => seen.push('one'));
    const offTwo = onPluginPush('plugin-a', () => seen.push('two'));

    dispatchPluginPush('plugin-a', {});

    expect(seen).toEqual(['one', 'two']);

    offOne();
    offTwo();
  });

  // one plugin's broken handler must not stop the next one
  test('should carry on when a handler throws', () => {
    const seen: string[] = [];
    const offOne = onPluginPush('plugin-a', () => {
      throw new Error('boom');
    });
    const offTwo = onPluginPush('plugin-a', () => seen.push('ran'));

    dispatchPluginPush('plugin-a', {});

    expect(seen).toEqual(['ran']);

    offOne();
    offTwo();
  });
});
