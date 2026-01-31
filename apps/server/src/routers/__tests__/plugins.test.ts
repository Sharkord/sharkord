import { type TPluginInfo } from '@sharkord/shared';
import { beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { initTest } from '../../__tests__/helpers';
import { loadMockedPlugins, resetPluginMocks } from '../../__tests__/mocks';
import { tdb } from '../../__tests__/setup';
import { pluginData } from '../../db/schema';
import { pluginManager } from '../../plugins';

describe('plugins router', () => {
  beforeAll(loadMockedPlugins);
  beforeEach(resetPluginMocks);

  test('should throw when user lacks permissions', async () => {
    const { caller } = await initTest(2);

    await expect(caller.plugins.get()).rejects.toThrow(
      'Insufficient permissions'
    );
  });

  test('should return all plugins when user has permissions', async () => {
    const { caller } = await initTest();

    const { plugins } = await caller.plugins.get();

    expect(plugins).toBeDefined();
    expect(plugins.length).toBe(7);
  });

  test('should include plugin metadata', async () => {
    const { caller } = await initTest();

    const result = await caller.plugins.get();
    const pluginA = result.plugins.find(
      (p: TPluginInfo) => p.id === 'plugin-a'
    );

    expect(pluginA).toBeDefined();
    expect(pluginA!.name).toBe('plugin-a');
    expect(pluginA!.version).toBe('0.0.1');
    expect(pluginA!.author).toBe('My Name');
    expect(pluginA!.description).toBeDefined();
  });

  test('should filter out plugins with invalid package.json', async () => {
    const { caller } = await initTest();

    const result = await caller.plugins.get();
    const invalidPlugin = result.plugins.find(
      (p: TPluginInfo) => p.id === 'plugin-invalid-package'
    );

    expect(invalidPlugin).toBeUndefined();
  });

  test('should include enabled state', async () => {
    const { caller } = await initTest();

    const result = await caller.plugins.get();
    const pluginA = result.plugins.find(
      (p: TPluginInfo) => p.id === 'plugin-a'
    );

    expect(pluginA).toBeDefined();
    expect(pluginA!.enabled).toBe(true);
  });

  test('should throw when user lacks permissions', async () => {
    const { caller } = await initTest(2);

    await expect(
      caller.plugins.toggle({
        pluginId: 'plugin-a',
        enabled: false
      })
    ).rejects.toThrow('Insufficient permissions');
  });

  test('should enable plugin', async () => {
    const { caller } = await initTest();

    await caller.plugins.toggle({
      pluginId: 'plugin-a',
      enabled: true
    });

    const result = await caller.plugins.get();
    const pluginA = result.plugins.find(
      (p: TPluginInfo) => p.id === 'plugin-a'
    );

    expect(pluginA!.enabled).toBe(true);
  });

  test('should disable plugin', async () => {
    const { caller } = await initTest();

    // first enable
    await caller.plugins.toggle({
      pluginId: 'plugin-a',
      enabled: true
    });

    // then disable it
    await caller.plugins.toggle({
      pluginId: 'plugin-a',
      enabled: false
    });

    const result = await caller.plugins.get();
    const pluginA = result.plugins.find(
      (p: TPluginInfo) => p.id === 'plugin-a'
    );

    expect(pluginA!.enabled).toBe(false);
  });

  test('should persist plugin state to database', async () => {
    const { caller } = await initTest();

    await caller.plugins.toggle({
      pluginId: 'plugin-a',
      enabled: true
    });

    const row = await tdb
      .select({ enabled: pluginData.enabled })
      .from(pluginData)
      .where(eq(pluginData.pluginId, 'plugin-a'))
      .get();

    expect(row?.enabled).toBe(true);
  });

  test('should load plugin when enabled', async () => {
    const { caller } = await initTest();

    await caller.plugins.toggle({
      pluginId: 'plugin-b',
      enabled: true
    });

    const result = await caller.plugins.get();
    const pluginB = result.plugins.find(
      (p: TPluginInfo) => p.id === 'plugin-b'
    );

    expect(pluginB!.enabled).toBe(true);
    expect(pluginB!.loadError).toBeUndefined();
  });

  test('should unload plugin when disabled', async () => {
    const { caller } = await initTest();

    // first enable
    await caller.plugins.toggle({
      pluginId: 'plugin-b',
      enabled: true
    });

    // check it's enabled
    let result = await caller.plugins.get();
    let pluginB = result.plugins.find((p: TPluginInfo) => p.id === 'plugin-b');

    expect(pluginB!.enabled).toBe(true);

    // then disable it
    await caller.plugins.toggle({
      pluginId: 'plugin-b',
      enabled: false
    });

    // check it's disabled
    result = await caller.plugins.get();
    pluginB = result.plugins.find((p: TPluginInfo) => p.id === 'plugin-b');

    expect(pluginB!.enabled).toBe(false);
  });

  describe('getCommands', () => {
    test('should throw when user lacks permissions', async () => {
      const { caller } = await initTest(2);

      await expect(
        caller.plugins.getCommands({
          pluginId: 'plugin-b'
        })
      ).rejects.toThrow('Insufficient permissions');
    });

    test('should return commands filtered by pluginId', async () => {
      const { caller } = await initTest();

      await pluginManager.load('plugin-b');
      await pluginManager.load('plugin-with-events');

      const commands = await caller.plugins.getCommands({
        pluginId: 'plugin-b'
      });

      expect(commands).toBeDefined();
      expect(commands['plugin-b']).toBeDefined();
      expect(commands['plugin-b']!.length).toBe(2);
      // should not include other plugins when filtering
      expect(commands['plugin-with-events']).toBeUndefined();
    });

    test('should return all commands when pluginId is omitted', async () => {
      const { caller } = await initTest();

      await pluginManager.load('plugin-b');
      await pluginManager.load('plugin-with-events');

      const commands = await caller.plugins.getCommands({});

      expect(commands).toBeDefined();
      expect(commands['plugin-b']).toBeDefined();
      expect(commands['plugin-with-events']).toBeDefined();
    });

    test('should return empty object for non-existent pluginId', async () => {
      const { caller } = await initTest();

      const commands = await caller.plugins.getCommands({
        pluginId: 'nonexistent-plugin'
      });

      expect(commands).toBeDefined();
      expect(Object.keys(commands).length).toBe(0);
    });

    test('should return empty object when no plugins loaded', async () => {
      const { caller } = await initTest();

      const commands = await caller.plugins.getCommands({
        pluginId: 'plugin-a'
      });

      expect(commands).toBeDefined();
      expect(Object.keys(commands).length).toBe(0);
    });

    test('should include command metadata', async () => {
      const { caller } = await initTest();

      await pluginManager.load('plugin-b');

      const commands = await caller.plugins.getCommands({
        pluginId: 'plugin-b'
      });

      const pluginBCommands = commands['plugin-b'];

      expect(pluginBCommands).toBeDefined();

      const testCommand = pluginBCommands!.find(
        (c) => c.name === 'test-command'
      );

      expect(testCommand).toBeDefined();
      expect(testCommand!.name).toBe('test-command');
      expect(testCommand!.description).toBeDefined();
    });
  });

  test('should throw when user lacks permissions', async () => {
    const { caller } = await initTest(2);

    await expect(
      caller.plugins.executeCommand({
        pluginId: 'plugin-b',
        commandName: 'sum',
        args: { a: 5, b: 3 }
      })
    ).rejects.toThrow('Insufficient permissions');
  });

  test('should execute command successfully', async () => {
    const { caller } = await initTest();

    await pluginManager.load('plugin-b');

    const result = await caller.plugins.executeCommand({
      pluginId: 'plugin-b',
      commandName: 'sum',
      args: { a: 10, b: 20 }
    });

    expect(result).toBeDefined();
    expect((result as Record<string, number>).result).toBe(30);
  });

  test('should execute command with string argument', async () => {
    const { caller } = await initTest();

    await pluginManager.load('plugin-b');

    const result = await caller.plugins.executeCommand({
      pluginId: 'plugin-b',
      commandName: 'test-command',
      args: { message: 'Hello World' }
    });

    expect(result).toBeDefined();
    expect((result as Record<string, unknown>).success).toBe(true);
    expect((result as Record<string, string>).message).toBe('Hello World');
  });

  test('should throw when command does not exist', async () => {
    const { caller } = await initTest();

    await pluginManager.load('plugin-b');

    await expect(
      caller.plugins.executeCommand({
        pluginId: 'plugin-b',
        commandName: 'nonexistent',
        args: {}
      })
    ).rejects.toThrow('not found');
  });

  test('should throw when plugin is not loaded', async () => {
    const { caller } = await initTest();

    await expect(
      caller.plugins.executeCommand({
        pluginId: 'plugin-b',
        commandName: 'sum',
        args: { a: 1, b: 2 }
      })
    ).rejects.toThrow('not found');
  });

  test('should execute command without args', async () => {
    const { caller } = await initTest();

    await pluginManager.load('plugin-with-events');

    const result = await caller.plugins.executeCommand({
      pluginId: 'plugin-with-events',
      commandName: 'get-counts'
    });

    expect(result).toBeDefined();
    expect((result as Record<string, number>).userJoined).toBe(0);
    expect((result as Record<string, number>).userLeft).toBe(0);
    expect((result as Record<string, number>).messageCreated).toBe(0);
  });

  test('should throw when user lacks permissions', async () => {
    const { caller } = await initTest(2);

    await expect(
      caller.plugins.getLogs({
        pluginId: 'plugin-a'
      })
    ).rejects.toThrow('Insufficient permissions');
  });

  test('should return plugin logs', async () => {
    const { caller } = await initTest();

    await pluginManager.load('plugin-a');

    const logs = await caller.plugins.getLogs({
      pluginId: 'plugin-a'
    });

    expect(logs).toBeDefined();
    expect(Array.isArray(logs)).toBe(true);
    expect(logs.length).toBeGreaterThan(0);
  });

  test('should include log metadata', async () => {
    const { caller } = await initTest();

    await pluginManager.load('plugin-a');

    const logs = await caller.plugins.getLogs({
      pluginId: 'plugin-a'
    });

    const log = logs[0];
    expect(log).toBeDefined();
    expect(log!.pluginId).toBe('plugin-a');
    expect(log!.message).toBeDefined();
    expect(log!.timestamp).toBeDefined();
    expect(log!.type).toBeDefined();
  });

  test('should return empty array when plugin has no logs', async () => {
    const { caller } = await initTest();

    const logs = await caller.plugins.getLogs({
      pluginId: 'plugin-no-unload'
    });

    expect(logs).toBeDefined();
    expect(Array.isArray(logs)).toBe(true);
    expect(logs.length).toBeGreaterThanOrEqual(0);
  });

  test('should include load error logs', async () => {
    const { caller } = await initTest();

    await pluginManager.togglePlugin('plugin-throws-error', true);
    await pluginManager.load('plugin-throws-error');

    const logs = await caller.plugins.getLogs({
      pluginId: 'plugin-throws-error'
    });

    expect(logs.length).toBeGreaterThan(0);
    const errorLog = logs.find((log) => log.type === 'error');
    expect(errorLog).toBeDefined();
  });
});
