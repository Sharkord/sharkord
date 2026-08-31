import { ActivityLogType, type TPluginInfo } from '@sharkord/shared';
import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';
import { initTest } from '../../__tests__/helpers';
import { loadMockedPlugins, resetPluginMocks } from '../../__tests__/mocks';
import { tdb } from '../../__tests__/setup';
import { activityLog, pluginData } from '../../db/schema';
import { PLUGINS_PATH } from '../../helpers/paths';
import { pluginManager } from '../../plugins';
import { eventBus } from '../../plugins/event-bus';

describe('plugins router', () => {
  beforeEach(async () => {
    await loadMockedPlugins();
    await resetPluginMocks();
  });

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
    // every directory under the plugins path is listed, broken ones included
    expect(plugins.length).toBe(
      (await pluginManager.getPluginsFromPath()).length
    );
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

  test('should list plugins with an invalid manifest.json and say why', async () => {
    const { caller } = await initTest();

    const result = await caller.plugins.get();
    const invalidPlugin = result.plugins.find(
      (p: TPluginInfo) => p.id === 'plugin-invalid-package'
    );

    expect(invalidPlugin).toBeDefined();
    expect(invalidPlugin!.loadError).toContain('manifest.json');
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

  test('should throw when user lacks permissions for executeAction', async () => {
    const { caller } = await initTest(2);

    await expect(
      caller.plugins.executeAction({
        pluginId: 'plugin-b',
        actionName: 'multiply',
        payload: { a: 2, b: 3 }
      })
    ).rejects.toThrow('Insufficient permissions');
  });

  test('should execute action successfully', async () => {
    const { caller } = await initTest();

    await pluginManager.load('plugin-b');

    const result = await caller.plugins.executeAction({
      pluginId: 'plugin-b',
      actionName: 'multiply',
      payload: { a: 8, b: 5 }
    });

    expect(result).toBeDefined();
    expect((result as Record<string, number>).result).toBe(40);
  });

  test('should throw when action does not exist', async () => {
    const { caller } = await initTest();

    await pluginManager.load('plugin-b');

    await expect(
      caller.plugins.executeAction({
        pluginId: 'plugin-b',
        actionName: 'nonexistent',
        payload: {}
      })
    ).rejects.toThrow('not found');
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

  describe('remove', () => {
    test('should throw when user lacks permissions', async () => {
      const { caller } = await initTest(2);

      await expect(
        caller.plugins.remove({
          pluginId: 'plugin-a'
        })
      ).rejects.toThrow('Insufficient permissions');
    });

    test('should remove plugin successfully', async () => {
      const { caller } = await initTest();

      const before = await caller.plugins.get();
      const hadPlugin = before.plugins.some(
        (p: TPluginInfo) => p.id === 'plugin-a'
      );
      expect(hadPlugin).toBe(true);

      await caller.plugins.remove({ pluginId: 'plugin-a' });

      const after = await caller.plugins.get();
      const hasPlugin = after.plugins.some(
        (p: TPluginInfo) => p.id === 'plugin-a'
      );
      expect(hasPlugin).toBe(false);
    });

    test('should remove plugin directory from filesystem', async () => {
      const { caller } = await initTest();

      const pluginPath = path.join(PLUGINS_PATH, 'plugin-a');
      const existsBefore = await fs
        .access(pluginPath)
        .then(() => true)
        .catch(() => false);
      expect(existsBefore).toBe(true);

      await caller.plugins.remove({ pluginId: 'plugin-a' });

      const existsAfter = await fs
        .access(pluginPath)
        .then(() => true)
        .catch(() => false);
      expect(existsAfter).toBe(false);
    });

    test('should unload plugin before removing', async () => {
      const { caller } = await initTest();

      await pluginManager.load('plugin-b');

      const before = await caller.plugins.get();
      const pluginB = before.plugins.find(
        (p: TPluginInfo) => p.id === 'plugin-b'
      );
      expect(pluginB!.enabled).toBe(true);

      await caller.plugins.remove({ pluginId: 'plugin-b' });

      const after = await caller.plugins.get();
      const removed = after.plugins.find(
        (p: TPluginInfo) => p.id === 'plugin-b'
      );
      expect(removed).toBeUndefined();
    });
  });

  describe('getSettings', () => {
    test('should throw when user lacks permissions', async () => {
      const { caller } = await initTest(2);

      await expect(
        caller.plugins.getSettings({
          pluginId: 'plugin-with-settings'
        })
      ).rejects.toThrow('Insufficient permissions');
    });

    test('should return settings for plugin with settings', async () => {
      const { caller } = await initTest();

      await pluginManager.load('plugin-with-settings');

      const result = await caller.plugins.getSettings({
        pluginId: 'plugin-with-settings'
      });

      expect(result).toBeDefined();
      expect(result.definitions).toBeDefined();
      expect(result.definitions.length).toBe(3);
      expect(result.values).toBeDefined();
    });

    test('should include setting definitions with correct metadata', async () => {
      const { caller } = await initTest();

      await pluginManager.load('plugin-with-settings');

      const result = await caller.plugins.getSettings({
        pluginId: 'plugin-with-settings'
      });

      const greetingSetting = result.definitions.find(
        (d: { key: string }) => d.key === 'greeting'
      );
      expect(greetingSetting).toBeDefined();
      expect(greetingSetting!.type).toBe('string');
      expect(greetingSetting!.defaultValue).toBe('Hello!');
    });

    test('should return empty definitions for plugin without settings', async () => {
      const { caller } = await initTest();

      await pluginManager.load('plugin-a');

      const result = await caller.plugins.getSettings({
        pluginId: 'plugin-a'
      });

      expect(result).toBeDefined();
      expect(result.definitions).toEqual([]);
    });
  });

  describe('updateSetting', () => {
    test('should throw when user lacks permissions', async () => {
      const { caller } = await initTest(2);

      await expect(
        caller.plugins.updateSetting({
          pluginId: 'plugin-with-settings',
          key: 'greeting',
          value: 'Hi!'
        })
      ).rejects.toThrow('Insufficient permissions');
    });

    test('should update a setting value', async () => {
      const { caller } = await initTest();

      await pluginManager.load('plugin-with-settings');

      await caller.plugins.updateSetting({
        pluginId: 'plugin-with-settings',
        key: 'greeting',
        value: 'Hi there!'
      });

      const result = await caller.plugins.getSettings({
        pluginId: 'plugin-with-settings'
      });

      expect(result.values.greeting).toBe('Hi there!');
    });

    test('should update numeric setting', async () => {
      const { caller } = await initTest();

      await pluginManager.load('plugin-with-settings');

      await caller.plugins.updateSetting({
        pluginId: 'plugin-with-settings',
        key: 'maxRetries',
        value: 10
      });

      const result = await caller.plugins.getSettings({
        pluginId: 'plugin-with-settings'
      });

      expect(result.values.maxRetries).toBe(10);
    });

    test('should update boolean setting', async () => {
      const { caller } = await initTest();

      await pluginManager.load('plugin-with-settings');

      await caller.plugins.updateSetting({
        pluginId: 'plugin-with-settings',
        key: 'enabled',
        value: false
      });

      const result = await caller.plugins.getSettings({
        pluginId: 'plugin-with-settings'
      });

      expect(result.values.enabled).toBe(false);
    });

    test('should throw when a setting value has the wrong type', async () => {
      const { caller } = await initTest();

      await pluginManager.load('plugin-with-settings');

      await expect(
        caller.plugins.updateSetting({
          pluginId: 'plugin-with-settings',
          key: 'maxRetries',
          value: 'ten'
        })
      ).rejects.toThrow(
        "Setting 'maxRetries' expects a number, received string"
      );

      const result = await caller.plugins.getSettings({
        pluginId: 'plugin-with-settings'
      });

      expect(result.values.maxRetries).toBe(3);
    });

    test('should throw when setting key does not exist', async () => {
      const { caller } = await initTest();

      await pluginManager.load('plugin-with-settings');

      await expect(
        caller.plugins.updateSetting({
          pluginId: 'plugin-with-settings',
          key: 'nonexistent-key',
          value: 'test'
        })
      ).rejects.toThrow();
    });

    test('should throw when plugin has no settings', async () => {
      const { caller } = await initTest();

      await pluginManager.load('plugin-a');

      await expect(
        caller.plugins.updateSetting({
          pluginId: 'plugin-a',
          key: 'some-key',
          value: 'test'
        })
      ).rejects.toThrow();
    });
  });

  describe('install', () => {
    test('should throw when user lacks permissions', async () => {
      const { caller } = await initTest(2);

      await expect(
        caller.plugins.install({
          pluginId: 'plugin-example',
          version: '0.0.1'
        })
      ).rejects.toThrow('Insufficient permissions');
    });

    test('should call downloadPlugin with fetched URL and checksum', async () => {
      const { caller } = await initTest();
      const mockDownload = mock(() => Promise.resolve());

      mock.module('../../helpers/downloads', () => ({
        downloadPlugin: mockDownload,
        downloadFile: mock(() => Promise.resolve())
      }));

      mock.module('../../helpers/marketplace', () => ({
        fetchMarketplaceVersion: mock(() =>
          Promise.resolve({
            version: '0.0.1',
            downloadUrl: 'https://example.com/plugin.tar.gz',
            checksum: 'deadbeef1234',
            sdkVersion: 1,
            size: 1000
          })
        )
      }));

      await caller.plugins.install({
        pluginId: 'plugin-example',
        version: '0.0.1'
      });

      expect(mockDownload).toHaveBeenCalledWith(
        'plugin-example',
        'https://example.com/plugin.tar.gz',
        'deadbeef1234'
      );
    });

    test('should reject empty pluginId', async () => {
      const { caller } = await initTest();

      await expect(
        caller.plugins.install({
          pluginId: '',
          version: '0.0.1'
        })
      ).rejects.toThrow();
    });

    test('should reject missing version', async () => {
      const { caller } = await initTest();

      await expect(
        // @ts-expect-error intentionally omitting required field
        caller.plugins.install({
          pluginId: 'plugin-example'
        })
      ).rejects.toThrow();
    });
  });

  describe('concurrent installs', () => {
    test('should serialize installs of the same plugin', async () => {
      const { caller } = await initTest();
      const order: string[] = [];
      let active = 0;

      mock.module('../../helpers/downloads', () => ({
        downloadPlugin: mock(async () => {
          active += 1;
          order.push(`start:${active}`);

          await Bun.sleep(20);

          order.push(`end:${active}`);
          active -= 1;
        }),
        downloadFile: mock(() => Promise.resolve())
      }));

      mock.module('../../helpers/marketplace', () => ({
        fetchMarketplaceVersion: mock(() =>
          Promise.resolve({
            version: '0.0.1',
            downloadUrl: 'https://example.com/plugin-a.tar.gz',
            checksum: 'deadbeef1234',
            sdkVersion: 1,
            size: 1000
          })
        )
      }));

      await Promise.all([
        caller.plugins.install({ pluginId: 'plugin-a', version: '0.0.1' }),
        caller.plugins.update({ pluginId: 'plugin-a', version: '0.0.1' })
      ]);

      // never two swaps in flight at once, so the directory is never half written
      expect(order).toEqual(['start:1', 'end:1', 'start:1', 'end:1']);
    });

    test('should not serialize installs of different plugins', async () => {
      const { caller } = await initTest();
      let active = 0;
      let peak = 0;

      mock.module('../../helpers/downloads', () => ({
        downloadPlugin: mock(async () => {
          active += 1;
          peak = Math.max(peak, active);

          await Bun.sleep(20);

          active -= 1;
        }),
        downloadFile: mock(() => Promise.resolve())
      }));

      mock.module('../../helpers/marketplace', () => ({
        fetchMarketplaceVersion: mock(() =>
          Promise.resolve({
            version: '0.0.1',
            downloadUrl: 'https://example.com/plugin.tar.gz',
            checksum: 'deadbeef1234',
            sdkVersion: 1,
            size: 1000
          })
        )
      }));

      await Promise.all([
        caller.plugins.install({ pluginId: 'plugin-a', version: '0.0.1' }),
        caller.plugins.install({ pluginId: 'plugin-b', version: '0.0.1' })
      ]);

      expect(peak).toBe(2);
    });

    test('should still run a queued install after the one before it fails', async () => {
      const { caller } = await initTest();
      let calls = 0;

      mock.module('../../helpers/downloads', () => ({
        downloadPlugin: mock(async () => {
          calls += 1;

          if (calls === 1) {
            throw new Error('network exploded');
          }
        }),
        downloadFile: mock(() => Promise.resolve())
      }));

      mock.module('../../helpers/marketplace', () => ({
        fetchMarketplaceVersion: mock(() =>
          Promise.resolve({
            version: '0.0.1',
            downloadUrl: 'https://example.com/plugin-a.tar.gz',
            checksum: 'deadbeef1234',
            sdkVersion: 1,
            size: 1000
          })
        )
      }));

      const [first, second] = await Promise.allSettled([
        caller.plugins.install({ pluginId: 'plugin-a', version: '0.0.1' }),
        caller.plugins.install({ pluginId: 'plugin-a', version: '0.0.1' })
      ]);

      expect(first!.status).toBe('rejected');
      expect(second!.status).toBe('fulfilled');
      expect(calls).toBe(2);
    });
  });

  describe('commands sent through chat', () => {
    const getLastMessage = async (
      caller: Awaited<ReturnType<typeof initTest>>['caller']
    ) => {
      const result = await caller.messages.get({
        channelId: 1,
        cursor: null,
        limit: 1
      });

      return result.messages[0]!;
    };

    test('should store a command chip carrying the plugin logo', async () => {
      const { caller } = await initTest();

      await pluginManager.load('plugin-b');
      await caller.messages.send({
        channelId: 1,
        content: '<p>/sum 2 3</p>',
        files: []
      });

      const message = await getLastMessage(caller);

      expect(message.content).toContain('<command ');
      expect(message.content).toContain(
        'data-plugin-logo="https://example.com/logo.png"'
      );
      expect(message.content).toContain('data-plugin-id="plugin-b"');
      expect(message.content).toContain('data-command="sum"');
      // a command chip is rendered from its attributes, not edited as text
      expect(message.editable).toBe(false);
    });

    test('should record the command result on the message once it finishes', async () => {
      const { caller } = await initTest();

      await pluginManager.load('plugin-b');
      await caller.messages.send({
        channelId: 1,
        content: '<p>/sum 2 3</p>',
        files: []
      });

      const messageId = (await getLastMessage(caller)).id;

      // the executor deliberately runs after the mutation returns
      await Bun.sleep(50);

      const message = await getLastMessage(caller);

      expect(message.id).toBe(messageId);
      expect(message.content).toContain('data-status="completed"');
      expect(message.content).toContain('&quot;result&quot;: 5');
    });

    test('should leave a normal message alone when it is not a command', async () => {
      const { caller } = await initTest();

      await pluginManager.load('plugin-b');
      await caller.messages.send({
        channelId: 1,
        content: '<p>just talking</p>',
        files: []
      });

      const message = await getLastMessage(caller);

      expect(message.content).not.toContain('<command');
      expect(message.editable).toBe(true);
    });
  });

  describe('log subscription', () => {
    // plugin logs carry whatever a plugin writes, so this has to be gated the
    // same way the getLogs query is
    test('should throw when user lacks permissions', async () => {
      const { caller } = await initTest(2);

      await expect(caller.plugins.onLog()).rejects.toThrow(
        'Insufficient permissions'
      );
    });

    test('should subscribe when user can manage plugins', async () => {
      const { caller } = await initTest();

      const subscription = await caller.plugins.onLog();

      expect(subscription).toBeDefined();
    });
  });

  describe('command subscription', () => {
    // every client subscribes to this on connect, so a permission check here
    // disconnects everyone who cannot use plugins
    test('should subscribe even when the user cannot use plugins', async () => {
      const { caller } = await initTest(2);

      expect(await caller.plugins.onCommandsChange()).toBeDefined();
    });
  });

  describe('update', () => {
    test('should call downloadPlugin with fetched URL and checksum', async () => {
      const { caller } = await initTest();
      const mockDownload = mock(() => Promise.resolve());

      mock.module('../../helpers/downloads', () => ({
        downloadPlugin: mockDownload,
        downloadFile: mock(() => Promise.resolve())
      }));

      mock.module('../../helpers/marketplace', () => ({
        fetchMarketplaceVersion: mock(() =>
          Promise.resolve({
            version: '2.0.0',
            downloadUrl: 'https://example.com/plugin-a-v2.tar.gz',
            checksum: 'cafebabe5678',
            sdkVersion: 1,
            size: 2000
          })
        )
      }));

      await caller.plugins.update({
        pluginId: 'plugin-a',
        version: '2.0.0'
      });

      expect(mockDownload).toHaveBeenCalledWith(
        'plugin-a',
        'https://example.com/plugin-a-v2.tar.gz',
        'cafebabe5678'
      );
    });

    test('should leave an enabled plugin loaded when the download fails', async () => {
      const { caller } = await initTest();

      await pluginManager.togglePlugin('plugin-a', true);

      mock.module('../../helpers/downloads', () => ({
        downloadPlugin: mock(() =>
          Promise.reject(new Error('network exploded'))
        ),
        downloadFile: mock(() => Promise.resolve())
      }));

      mock.module('../../helpers/marketplace', () => ({
        fetchMarketplaceVersion: mock(() =>
          Promise.resolve({
            version: '0.0.1',
            downloadUrl: 'https://example.com/plugin-a.tar.gz',
            checksum: 'deadbeef1234',
            sdkVersion: 1,
            size: 1000
          })
        )
      }));

      await expect(
        caller.plugins.update({ pluginId: 'plugin-a', version: '0.0.1' })
      ).rejects.toThrow('network exploded');

      // still enabled and still running: the failure must not have taken the
      // plugin down or flipped its persisted state
      expect(pluginManager.isEnabled('plugin-a')).toBe(true);
      expect(eventBus.hasPlugin('plugin-a')).toBe(true);

      const { plugins } = await caller.plugins.get();
      const pluginA = plugins.find((p: TPluginInfo) => p.id === 'plugin-a');

      expect(pluginA!.enabled).toBe(true);
    });

    test('should reject empty version', async () => {
      const { caller } = await initTest();

      await expect(
        caller.plugins.update({
          pluginId: 'plugin-a',
          version: ''
        })
      ).rejects.toThrow();
    });

    test('should reject invalid plugin ID with uppercase', async () => {
      const { caller } = await initTest();

      await expect(
        caller.plugins.update({
          pluginId: 'Plugin-A',
          version: '1.0.0'
        })
      ).rejects.toThrow();
    });
  });

  describe('pluginId validation in routes', () => {
    test('should reject uppercase pluginId in toggle', async () => {
      const { caller } = await initTest();

      await expect(
        caller.plugins.toggle({
          pluginId: 'Plugin-A',
          enabled: true
        })
      ).rejects.toThrow();
    });

    test('should reject pluginId with underscores in executeCommand', async () => {
      const { caller } = await initTest();

      await expect(
        caller.plugins.executeCommand({
          pluginId: 'plugin_a',
          commandName: 'sum',
          args: {}
        })
      ).rejects.toThrow();
    });

    test('should reject pluginId with path traversal in getLogs', async () => {
      const { caller } = await initTest();

      await expect(
        caller.plugins.getLogs({
          pluginId: '../../../etc'
        })
      ).rejects.toThrow();
    });

    test('should reject pluginId with uppercase in executeAction', async () => {
      const { caller } = await initTest();

      await expect(
        caller.plugins.executeAction({
          pluginId: 'Plugin-B',
          actionName: 'multiply',
          payload: {}
        })
      ).rejects.toThrow();
    });

    test('should reject pluginId with underscores in remove', async () => {
      const { caller } = await initTest();

      await expect(
        caller.plugins.remove({
          pluginId: 'plugin_a'
        })
      ).rejects.toThrow();
    });
  });

  // the audit added these three entries. the setting one is the reason this is worth a test:
  // plugin settings hold api keys and tokens, so the log has to record that a key changed
  // without recording what it changed to
  describe('activity log', () => {
    const logsOfType = async (type: ActivityLogType) => {
      // the log is queued off the request path, so the row lands a tick after the call returns
      await Bun.sleep(20);

      return tdb
        .select({ userId: activityLog.userId, details: activityLog.details })
        .from(activityLog)
        .where(eq(activityLog.type, type));
    };

    test('should log a plugin install with its version', async () => {
      const { caller } = await initTest();

      mock.module('../../helpers/downloads', () => ({
        downloadPlugin: mock(() => Promise.resolve()),
        downloadFile: mock(() => Promise.resolve())
      }));

      mock.module('../../helpers/marketplace', () => ({
        fetchMarketplaceVersion: mock(() =>
          Promise.resolve({
            version: '0.0.1',
            downloadUrl: 'https://example.com/plugin.tar.gz',
            checksum: 'deadbeef1234',
            sdkVersion: 1,
            size: 1000
          })
        )
      }));

      await caller.plugins.install({
        pluginId: 'plugin-example',
        version: '0.0.1'
      });

      const entries = await logsOfType(ActivityLogType.PLUGIN_INSTALLED);

      expect(entries.length).toBe(1);
      expect(entries[0]!.userId).toBe(1);
      expect(entries[0]!.details).toMatchObject({
        pluginId: 'plugin-example',
        version: '0.0.1'
      });
    });

    test('should log a setting update by key without recording the value', async () => {
      const { caller } = await initTest();

      await pluginManager.load('plugin-with-settings');

      const secret = 'sk-live-do-not-log-me';

      await caller.plugins.updateSetting({
        pluginId: 'plugin-with-settings',
        key: 'greeting',
        value: secret
      });

      const entries = await logsOfType(ActivityLogType.PLUGIN_SETTING_UPDATED);

      expect(entries.length).toBe(1);
      expect(entries[0]!.details).toMatchObject({
        pluginId: 'plugin-with-settings',
        key: 'greeting'
      });

      // serialized rather than field by field: a value leaking under any other name, or
      // nested inside one, has to fail this too
      expect(JSON.stringify(entries[0]!.details)).not.toContain(secret);
    });

    test('should log a plugin removal', async () => {
      const { caller } = await initTest();

      await caller.plugins.remove({ pluginId: 'plugin-a' });

      const entries = await logsOfType(ActivityLogType.PLUGIN_REMOVED);

      expect(entries.length).toBe(1);
      expect(entries[0]!.userId).toBe(1);
      expect(entries[0]!.details).toMatchObject({ pluginId: 'plugin-a' });
    });
  });
});

describe('plugin commands in messages', () => {
  beforeEach(resetPluginMocks);

  test('parses the command from the sanitized content, not the raw input', async () => {
    const { caller } = await initTest();

    await pluginManager.loadPlugins();

    // the <script> is stripped by sanitizeMessageHtml, so a parser reading the
    // raw input would see different text than what gets stored and displayed
    const messageId = await caller.messages.send({
      channelId: 1,
      content: '<p>/test-command hello<script>ignored</script></p>',
      files: []
    });

    const message = await caller.messages.getOne({ messageId });

    expect(message.content).not.toContain('script');
  });
});
