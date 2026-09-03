import {
  ActivityLogType,
  ChannelType,
  OWNER_ROLE_ID,
  Permission,
  PluginCapabilityMode,
  PluginCapabilityType,
  PluginSlot,
  ServerEvents,
  type TPluginInfo,
  type TPluginPushEvent
} from '@sharkord/shared';
import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';
import { initTest } from '../../__tests__/helpers';
import { loadMockedPlugins, resetPluginMocks } from '../../__tests__/mocks';
import { tdb, testsBaseUrl } from '../../__tests__/setup';
import { getUserRoleIds } from '../../db/queries/roles';
import {
  activityLog,
  categories,
  channels,
  files,
  messageFiles,
  messageReactions,
  messages,
  pluginData,
  pluginUserData,
  rolePermissions,
  userRoles,
  users
} from '../../db/schema';
import { PLUGINS_PATH } from '../../helpers/paths';
import {
  canUseCapability,
  getCapabilityAccessRules
} from '../../helpers/plugin-capability-access';
import { pluginManager } from '../../plugins';
import { eventBus } from '../../plugins/event-bus';
import { drainActivityLogQueue } from '../../queues/activity-log';
import { pubsub } from '../../utils/pubsub';

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
      expect(commands['plugin-b']!.length).toBeGreaterThan(0);
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
      expect(result.definitions.length).toBeGreaterThan(0);
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

  describe('beforeMessageSave hook', () => {
    const sendMessage = async (
      caller: Awaited<ReturnType<typeof initTest>>['caller'],
      content: string
    ) =>
      caller.messages.send({
        channelId: 1,
        content: `<p>${content}</p>`,
        files: []
      });

    const getLastContent = async (
      caller: Awaited<ReturnType<typeof initTest>>['caller']
    ) => {
      const result = await caller.messages.get({
        channelId: 1,
        cursor: null,
        limit: 1
      });

      return result.messages[0]!;
    };

    beforeEach(async () => {
      await pluginManager.togglePlugin('plugin-before-message-save', true);
    });

    test('should leave an ordinary message untouched', async () => {
      const { caller } = await initTest();

      await sendMessage(caller, 'hello there');

      expect((await getLastContent(caller)).content).toContain('hello there');
    });

    test('should let a plugin rewrite a message before it is stored', async () => {
      const { caller } = await initTest();

      await sendMessage(caller, 'rewriteme please');

      const message = await getLastContent(caller);

      expect(message.content).toContain('rewritten by plugin');
      expect(message.content).not.toContain('rewriteme');
    });

    // the whole point of the hook: the message must never reach the database
    test('should let a plugin refuse a message, with its own reason', async () => {
      const { caller } = await initTest();

      await sendMessage(caller, 'before the filter');

      const before = await getLastContent(caller);

      await expect(sendMessage(caller, 'rejectme now')).rejects.toThrow(
        'Blocked by the test filter'
      );

      expect((await getLastContent(caller)).id).toBe(before.id);
    });

    test('should run on edits too, so a filter cannot be dodged by editing', async () => {
      const { caller } = await initTest();

      await sendMessage(caller, 'innocent');

      const messageId = (await getLastContent(caller)).id;

      await expect(
        caller.messages.edit({ messageId, content: '<p>rejectme now</p>' })
      ).rejects.toThrow('Blocked by the test filter');

      expect((await getLastContent(caller)).content).toContain('innocent');
    });

    test('should rewrite on edit as well', async () => {
      const { caller } = await initTest();

      await sendMessage(caller, 'innocent');

      const messageId = (await getLastContent(caller)).id;

      await caller.messages.edit({
        messageId,
        content: '<p>rewriteme now</p>'
      });

      expect((await getLastContent(caller)).content).toContain(
        'rewritten by plugin'
      );
    });

    // a plugin returns untrusted html, exactly like a user does
    test('should sanitize what a plugin returns', async () => {
      const { caller } = await initTest();

      await sendMessage(caller, 'injectme');

      const message = await getLastContent(caller);

      expect(message.content).toContain('ok');
      expect(message.content).not.toContain('<script');
    });

    test('should refuse a replacement that is empty', async () => {
      const { caller } = await initTest();

      await expect(sendMessage(caller, 'emptyme')).rejects.toThrow(
        'replaced this message with empty content'
      );
    });

    // a throw is a bug, not a decision, so the sender learns nothing from it
    test('should fail closed with a generic message when a hook throws', async () => {
      const { caller } = await initTest();

      await expect(sendMessage(caller, 'crashme')).rejects.toThrow(
        'A plugin failed while checking this request.'
      );
    });

    test('should record a thrown hook against the plugin log', async () => {
      const { caller } = await initTest();

      await expect(sendMessage(caller, 'crashme')).rejects.toThrow();

      const logs = pluginManager.getLogs('plugin-before-message-save');

      expect(
        logs.some(
          (log) => log.type === 'error' && log.message.includes('Hook failed')
        )
      ).toBe(true);
    });

    test('should not run while the plugin is disabled', async () => {
      const { caller } = await initTest();

      await pluginManager.togglePlugin('plugin-before-message-save', false);

      await sendMessage(caller, 'rejectme now');

      expect((await getLastContent(caller)).content).toContain('rejectme');
    });
  });

  describe('other hooks', () => {
    beforeEach(async () => {
      await pluginManager.togglePlugin('plugin-before-message-save', true);
    });

    test('should let a plugin rename a channel as it is created', async () => {
      const { caller } = await initTest();

      const channelId = await caller.channels.add({
        name: 'renameme',
        type: ChannelType.TEXT,
        categoryId: 1
      });

      const channel = await caller.channels.get({ channelId });

      expect(channel!.name).toBe('renamed-by-plugin');
    });

    test('should let a plugin refuse a channel name', async () => {
      const { caller } = await initTest();

      await expect(
        caller.channels.add({
          name: 'rejectme',
          type: ChannelType.TEXT,
          categoryId: 1
        })
      ).rejects.toThrow('That channel name is not allowed');
    });

    test('should leave an ordinary channel name alone', async () => {
      const { caller } = await initTest();

      const channelId = await caller.channels.add({
        name: 'general-two',
        type: ChannelType.TEXT,
        categoryId: 1
      });

      const channel = await caller.channels.get({ channelId });

      expect(channel!.name).toBe('general-two');
    });

    test('should let a plugin refuse a voice join', async () => {
      const { caller } = await initTest();

      await expect(
        caller.voice.join({ channelId: 2, state: {} })
      ).rejects.toThrow('Voice is closed right now');
    });

    test('should let a plugin refuse a login', async () => {
      const response = await fetch(`${testsBaseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identity: 'blockedidentity',
          password: 'password123'
        })
      });

      const body = (await response.json()) as {
        errors: Record<string, string>;
      };

      expect(response.status).toBe(400);
      expect(body.errors.identity).toBe(
        'This account is not allowed to sign in'
      );
    });
  });

  describe('permissions and roles', () => {
    const MODERATOR_ROLE_ID = 4;

    beforeEach(async () => {
      await pluginManager.load('plugin-b');
    });

    test('should answer whether a user holds a permission', async () => {
      const { caller } = await initTest();

      const owner = await caller.plugins.executeCommand({
        pluginId: 'plugin-b',
        commandName: 'can-manage-users',
        args: { userId: 1 }
      });

      expect((owner as { allowed: boolean }).allowed).toBe(true);
    });

    test('should answer false for a user without the permission', async () => {
      const { caller } = await initTest();

      const result = await caller.plugins.executeCommand({
        pluginId: 'plugin-b',
        commandName: 'can-manage-users',
        args: { userId: 2 }
      });

      expect((result as { allowed: boolean }).allowed).toBe(false);
    });

    test('should let a plugin assign and remove a role', async () => {
      const { caller } = await initTest();

      await caller.plugins.executeCommand({
        pluginId: 'plugin-b',
        commandName: 'grant-role',
        args: { userId: 2, roleId: MODERATOR_ROLE_ID }
      });

      expect(await getUserRoleIds(2)).toContain(MODERATOR_ROLE_ID);

      await caller.plugins.executeCommand({
        pluginId: 'plugin-b',
        commandName: 'revoke-role',
        args: { userId: 2, roleId: MODERATOR_ROLE_ID }
      });

      expect(await getUserRoleIds(2)).not.toContain(MODERATOR_ROLE_ID);
    });

    // a plugin acts as the server, so it skips permission checks. the owner is
    // the one thing it still cannot touch
    test('should refuse to assign the owner role', async () => {
      const { caller } = await initTest();

      await expect(
        caller.plugins.executeCommand({
          pluginId: 'plugin-b',
          commandName: 'grant-role',
          args: { userId: 2, roleId: OWNER_ROLE_ID }
        })
      ).rejects.toThrow('cannot assign or remove the owner role');

      expect(await getUserRoleIds(2)).not.toContain(OWNER_ROLE_ID);
    });

    test('should refuse to change the roles of the server owner', async () => {
      const { caller } = await initTest();

      await expect(
        caller.plugins.executeCommand({
          pluginId: 'plugin-b',
          commandName: 'grant-role',
          args: { userId: 1, roleId: MODERATOR_ROLE_ID }
        })
      ).rejects.toThrow('cannot change the roles of the server owner');
    });

    test('should refuse a role that does not exist', async () => {
      const { caller } = await initTest();

      await expect(
        caller.plugins.executeCommand({
          pluginId: 'plugin-b',
          commandName: 'grant-role',
          args: { userId: 2, roleId: 9999 }
        })
      ).rejects.toThrow('Role not found');
    });
  });

  // plugin channel and category writes go through the same helpers the routes
  // use, so these check the plugin path reaches them and publishes
  describe('channel and category writes', () => {
    beforeEach(() => pluginManager.load('plugin-b'));

    const run = async (commandName: string, args: Record<string, unknown>) => {
      const { caller } = await initTest();

      return (await caller.plugins.executeCommand({
        pluginId: 'plugin-b',
        commandName,
        args
      })) as Record<string, number | boolean>;
    };

    test('should create a channel in a category', async () => {
      const result = await run('make-ticket', {
        name: 'ticket-1',
        categoryId: 1
      });

      const channel = await tdb
        .select()
        .from(channels)
        .where(eq(channels.id, result.channelId as number))
        .get();

      expect(channel!.name).toBe('ticket-1');
      expect(channel!.categoryId).toBe(1);
    });

    // a ticket channel that is public even briefly has leaked
    test('should create it private in one step', async () => {
      const result = await run('make-ticket', {
        name: 'ticket-2',
        categoryId: 1
      });

      expect(result.private).toBe(true);
    });

    test('should reject a category that does not exist', async () => {
      await expect(
        run('make-ticket', { name: 'nope', categoryId: 9999 })
      ).rejects.toThrow('Category not found');
    });

    test('should reject a name the route would reject too', async () => {
      await expect(
        run('make-ticket', { name: 'x'.repeat(28), categoryId: 1 })
      ).rejects.toThrow();
    });

    // channel 3 is the seeded DM, and the write calls refuse it, so listing it
    // would only offer a plugin ids it cannot use
    test('should read one of each kind by id', async () => {
      const result = (await run('lookup', {
        userId: 1,
        channelId: 1,
        categoryId: 1,
        roleId: OWNER_ROLE_ID
      })) as unknown as Record<string, string | number>;

      expect(result.user).toBe('Test Owner');
      expect(result.channel).toBe('General');
      expect(result.category).toBe('Text Channels');
      expect(result.role).toBe('Owner');
      expect(result.userCount).toBe(5);
    });

    test('should answer undefined for ids that do not exist', async () => {
      const result = (await run('lookup', {
        userId: 9999,
        channelId: 9999,
        categoryId: 9999,
        roleId: 9999
      })) as unknown as Record<string, string | undefined>;

      expect(result.user).toBeUndefined();
      expect(result.channel).toBeUndefined();
      expect(result.category).toBeUndefined();
      expect(result.role).toBeUndefined();
    });

    test('should list channels without the DMs', async () => {
      const result = (await run('list-channels', {})) as unknown as {
        names: string[];
      };

      expect(result.names).toContain('General');
      expect(result.names).not.toContain('DM Channel');
    });

    test('should update a channel', async () => {
      await run('rename-channel', { channelId: 1, name: 'renamed' });

      const channel = await tdb
        .select()
        .from(channels)
        .where(eq(channels.id, 1))
        .get();

      expect(channel!.name).toBe('renamed');
    });

    test('should delete a channel', async () => {
      await run('drop-channel', { channelId: 1 });

      const channel = await tdb
        .select()
        .from(channels)
        .where(eq(channels.id, 1))
        .get();

      expect(channel).toBeUndefined();
    });

    // channel 3 is the seeded DM, which the routes refuse to touch
    test('should refuse to update a DM channel', async () => {
      await expect(
        run('rename-channel', { channelId: 3, name: 'nope' })
      ).rejects.toThrow('Cannot update DM channels');
    });

    test('should refuse to delete a DM channel', async () => {
      await expect(run('drop-channel', { channelId: 3 })).rejects.toThrow(
        'Cannot delete DM channels'
      );
    });

    test('should create and list categories', async () => {
      const result = await run('make-category', { name: 'Tickets' });

      const category = await tdb
        .select()
        .from(categories)
        .where(eq(categories.id, result.categoryId as number))
        .get();

      expect(category!.name).toBe('Tickets');
      expect(result.count).toBe(3);
    });

    test('should delete a category and its channels', async () => {
      await run('drop-category', { categoryId: 1 });

      const remaining = await tdb
        .select()
        .from(channels)
        .where(eq(channels.categoryId, 1));

      expect(remaining).toHaveLength(0);
    });

    test('should reject deleting a category that does not exist', async () => {
      await expect(run('drop-category', { categoryId: 9999 })).rejects.toThrow(
        'Category not found'
      );
    });
  });

  // files are stored and linked in the one send call, so a plugin never holds a
  // file id and cannot leave bytes behind that no message points at
  describe('message attachments', () => {
    beforeEach(() => pluginManager.load('plugin-b'));

    const attach = async (body = 'hello attachment') => {
      const { caller } = await initTest();

      return (await caller.plugins.executeCommand({
        pluginId: 'plugin-b',
        commandName: 'attach',
        args: { channelId: 1, name: 'note.txt', body }
      })) as { messageId: number };
    };

    const attachedFile = async (messageId: number) => {
      const link = await tdb
        .select()
        .from(messageFiles)
        .where(eq(messageFiles.messageId, messageId))
        .get();

      if (!link) return undefined;

      return tdb.select().from(files).where(eq(files.id, link.fileId)).get();
    };

    test('should store the bytes as a real file row', async () => {
      const { messageId } = await attach();
      const file = await attachedFile(messageId);

      expect(file!.originalName).toBe('note.txt');
      expect(file!.size).toBe('hello attachment'.length);
      expect(file!.mimeType).toBeTruthy();
    });

    test('should own the file by plugin and not by a user', async () => {
      const { messageId } = await attach();
      const file = await attachedFile(messageId);

      expect(file!.pluginId).toBe('plugin-b');
      expect(file!.userId).toBeNull();
    });

    // a message that carries a file does not need to say anything
    test('should allow an empty message when a file is attached', async () => {
      const { messageId } = await attach();

      expect(messageId).toBeGreaterThan(0);
    });

    test('should refuse more files than the server allows', async () => {
      const { caller } = await initTest();

      await expect(
        caller.plugins.executeCommand({
          pluginId: 'plugin-b',
          commandName: 'send-too-many-files',
          args: { channelId: 1 }
        })
      ).rejects.toThrow('can be attached per message');
    });

    // nothing is written until every check has passed, so a refused message
    // cannot leave an unreferenced file behind
    test('should store nothing when the message is refused', async () => {
      const before = await tdb.select().from(files);

      const { caller } = await initTest();

      await expect(
        caller.plugins.executeCommand({
          pluginId: 'plugin-b',
          commandName: 'send-too-many-files',
          args: { channelId: 1 }
        })
      ).rejects.toThrow();

      expect(await tdb.select().from(files)).toHaveLength(before.length);
    });
  });

  // moderation goes through the same helpers the routes use. the routes protect
  // the owner by hierarchy, a plugin has no actor so it may never touch the owner
  describe('moderation', () => {
    beforeEach(() => pluginManager.load('plugin-b'));

    const moderate = async (action: string, userId: number) => {
      const { caller } = await initTest();

      return caller.plugins.executeCommand({
        pluginId: 'plugin-b',
        commandName: 'moderate',
        args: { action, userId }
      });
    };

    const readUser = async (userId: number) =>
      tdb.select().from(users).where(eq(users.id, userId)).get();

    test('should ban a user', async () => {
      await moderate('ban', 2);

      const user = await readUser(2);

      expect(user!.banned).toBe(true);
      expect(user!.banReason).toBe('spam');
      expect(user!.bannedAt).toBeGreaterThan(0);
    });

    test('should unban a user', async () => {
      await moderate('ban', 2);
      await moderate('unban', 2);

      const user = await readUser(2);

      expect(user!.banned).toBe(false);
      expect(user!.banReason).toBeNull();
    });

    test('should refuse to ban the server owner', async () => {
      await expect(moderate('ban', 1)).rejects.toThrow(
        'cannot ban the server owner'
      );

      expect((await readUser(1))!.banned).toBe(false);
    });

    test('should refuse to kick the server owner', async () => {
      await expect(moderate('kick', 1)).rejects.toThrow(
        'cannot kick the server owner'
      );
    });

    test('should refuse to kick a user with no session', async () => {
      await expect(moderate('kick', 2)).rejects.toThrow('not connected');
    });

    test('should reject a user that does not exist', async () => {
      await expect(moderate('ban', 9999)).rejects.toThrow('User not found');
    });

    test('should record the ban with no actor', async () => {
      await moderate('ban', 2);

      await drainActivityLogQueue();

      const entry = await tdb
        .select()
        .from(activityLog)
        .where(eq(activityLog.type, ActivityLogType.USER_BANNED))
        .get();

      // userId on the entry is the target; the actor lives in the details, and
      // a plugin has none
      expect(entry!.userId).toBe(2);
      expect(
        (entry!.details as { bannedBy?: number } | null)?.bannedBy
      ).toBeUndefined();
    });
  });

  // one blob per plugin per user, keyed by the plugin's own id, which the
  // server side takes from the context rather than from the caller
  describe('per-user data', () => {
    beforeEach(() => pluginManager.load('plugin-b'));

    const run = async (commandName: string, args: Record<string, unknown>) => {
      const { caller } = await initTest();

      return (await caller.plugins.executeCommand({
        pluginId: 'plugin-b',
        commandName,
        args
      })) as { data?: Record<string, unknown> };
    };

    test('should store and read back a user blob', async () => {
      await run('remember', { userId: 2, value: 'hello' });

      const result = await run('remember', { userId: 2 });

      expect(result.data).toEqual({ note: 'hello' });
    });

    test('should keep users apart', async () => {
      await run('remember', { userId: 2, value: 'two' });
      await run('remember', { userId: 5, value: 'five' });

      expect((await run('remember', { userId: 2 })).data).toEqual({
        note: 'two'
      });
      expect((await run('remember', { userId: 5 })).data).toEqual({
        note: 'five'
      });
    });

    test('should answer with an empty object when nothing was stored', async () => {
      expect((await run('remember', { userId: 2 })).data).toEqual({});
    });

    test('should delete a user blob', async () => {
      await run('remember', { userId: 2, value: 'hello' });
      await run('forget', { userId: 2 });

      expect((await run('remember', { userId: 2 })).data).toEqual({});
    });

    // the row references users with a cascade, so this needs no cleanup code
    test('should go with the user when the user is deleted', async () => {
      await run('remember', { userId: 2, value: 'hello' });

      const { caller } = await initTest();

      await caller.users.delete({ userId: 2, wipe: false });

      expect(
        await tdb
          .select()
          .from(pluginUserData)
          .where(eq(pluginUserData.userId, 2))
      ).toHaveLength(0);
    });

    test('should go when the plugin is uninstalled', async () => {
      await run('remember', { userId: 2, value: 'hello' });

      await pluginManager.removePlugin('plugin-b');

      expect(
        await tdb
          .select()
          .from(pluginUserData)
          .where(eq(pluginUserData.pluginId, 'plugin-b'))
      ).toHaveLength(0);
    });

    test('should refuse a blob over the size cap', async () => {
      await expect(
        run('remember', { userId: 2, value: 'x'.repeat(70_000) })
      ).rejects.toThrow('cannot exceed');
    });

    // the route names a plugin, never a user: it can only ever touch the
    // caller's own row
    test('should read and write only the caller row over trpc', async () => {
      // no seeded role can use plugins, so the moderator is granted it here
      await tdb.insert(rolePermissions).values({
        roleId: 4,
        permission: Permission.USE_PLUGINS,
        createdAt: Date.now()
      });

      const { caller } = await initTest(5);

      await caller.plugins.setUserData({
        pluginId: 'plugin-b',
        data: { theme: 'dark' }
      });

      expect(
        await caller.plugins.getUserData({ pluginId: 'plugin-b' })
      ).toEqual({ theme: 'dark' });

      const { caller: owner } = await initTest();

      expect(await owner.plugins.getUserData({ pluginId: 'plugin-b' })).toEqual(
        {}
      );
    });

    test('should need the plugin permission', async () => {
      const { caller } = await initTest(2);

      await expect(
        caller.plugins.getUserData({ pluginId: 'plugin-b' })
      ).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('pinning and reacting', () => {
    beforeEach(() => pluginManager.load('plugin-b'));

    const run = async (commandName: string, args: Record<string, unknown>) => {
      const { caller } = await initTest();

      return caller.plugins.executeCommand({
        pluginId: 'plugin-b',
        commandName,
        args
      });
    };

    const readMessage = async (messageId: number) =>
      tdb.select().from(messages).where(eq(messages.id, messageId)).get();

    const readReactions = async (messageId: number) =>
      tdb
        .select()
        .from(messageReactions)
        .where(eq(messageReactions.messageId, messageId));

    test('should pin a message with no actor', async () => {
      await run('pin', { messageId: 1, pinned: true });

      const message = await readMessage(1);

      expect(message!.pinned).toBe(true);
      expect(message!.pinnedAt).toBeGreaterThan(0);
      expect(message!.pinnedBy).toBeNull();
    });

    test('should unpin a message', async () => {
      await run('pin', { messageId: 1, pinned: true });
      await run('pin', { messageId: 1, pinned: false });

      const message = await readMessage(1);

      expect(message!.pinned).toBe(false);
      expect(message!.pinnedAt).toBeNull();
    });

    test('should refuse to pin a thread message', async () => {
      const { caller } = await initTest();

      const reply = await caller.messages.send({
        channelId: 1,
        content: '<p>reply</p>',
        parentMessageId: 1,
        files: []
      });

      await expect(
        run('pin', { messageId: reply, pinned: true })
      ).rejects.toThrow('Cannot pin a thread message');
    });

    // the plugin reacts as itself, so the row names it and has no user
    test('should react as the plugin', async () => {
      await run('react', { messageId: 1, emoji: '👍' });

      const [reaction] = await readReactions(1);

      expect(reaction!.pluginId).toBe('plugin-b');
      expect(reaction!.userId).toBeNull();
      expect(reaction!.emoji).toBe('👍');
    });

    test('should not react twice with the same emoji', async () => {
      await run('react', { messageId: 1, emoji: '👍' });
      await run('react', { messageId: 1, emoji: '👍' });

      expect(await readReactions(1)).toHaveLength(1);
    });

    test('should remove its own reaction', async () => {
      await run('react', { messageId: 1, emoji: '👍' });
      await run('react', { messageId: 1, emoji: '👍', remove: true });

      expect(await readReactions(1)).toHaveLength(0);
    });

    // a plugin reaction and a user reaction with the same emoji are separate
    test('should sit alongside a user reaction of the same emoji', async () => {
      const { caller } = await initTest();

      await caller.messages.toggleReaction({ messageId: 1, emoji: '👍' });
      await run('react', { messageId: 1, emoji: '👍' });

      const reactions = await readReactions(1);

      expect(reactions).toHaveLength(2);
      expect(
        reactions.filter((row) => row.pluginId === 'plugin-b')
      ).toHaveLength(1);
    });

    test('should reject a message that does not exist', async () => {
      await expect(
        run('react', { messageId: 9999, emoji: '👍' })
      ).rejects.toThrow('Message not found');
    });
  });

  // pushes are addressed server side, so a subscriber only ever sees its own
  describe('push', () => {
    beforeEach(() => pluginManager.load('plugin-b'));

    const listen = (userId: number) => {
      const received: TPluginPushEvent[] = [];

      const subscription = pubsub
        .subscribeFor(userId, ServerEvents.PLUGIN_PUSH)
        .subscribe({ next: (event) => received.push(event) });

      return { received, stop: () => subscription.unsubscribe() };
    };

    const push = async (args: Record<string, unknown>) => {
      const { caller } = await initTest();

      return caller.plugins.executeCommand({
        pluginId: 'plugin-b',
        commandName: 'push',
        args
      });
    };

    test('should reach the addressed user', async () => {
      const target = listen(2);

      await push({ target: 'user', userId: 2, note: 'hello' });

      expect(target.received).toEqual([
        { pluginId: 'plugin-b', data: { note: 'hello' } }
      ]);

      target.stop();
    });

    test('should not reach anyone else', async () => {
      const target = listen(2);
      const other = listen(5);

      await push({ target: 'user', userId: 2 });

      expect(target.received).toHaveLength(1);
      expect(other.received).toHaveLength(0);

      target.stop();
      other.stop();
    });

    test('should reach every user in a list', async () => {
      const target = listen(2);

      await push({ target: 'users', userId: 2 });

      expect(target.received).toHaveLength(1);

      target.stop();
    });

    test('should stop reaching a listener that unsubscribed', async () => {
      const target = listen(2);

      target.stop();

      await push({ target: 'user', userId: 2 });

      expect(target.received).toHaveLength(0);
    });

    test('should refuse a payload over the cap', async () => {
      const { caller } = await initTest();

      await expect(
        caller.plugins.executeCommand({
          pluginId: 'plugin-b',
          commandName: 'push-too-big',
          args: { userId: 2 }
        })
      ).rejects.toThrow('cannot exceed');
    });
  });

  describe('capability permissions', () => {
    const MODERATOR_ROLE = 4;
    const MEMBER_ROLE = 2;
    const MODERATOR_USER = 5;

    // no seeded role can use plugins, so the moderator is granted it here and
    // everything below then turns on the capability rules alone
    beforeEach(async () => {
      await tdb.insert(rolePermissions).values({
        roleId: MODERATOR_ROLE,
        permission: Permission.USE_PLUGINS,
        createdAt: Date.now()
      });

      await pluginManager.load('plugin-b');
    });

    const restrict = async (name: string, roleIds: number[]) => {
      const { caller } = await initTest();

      await caller.plugins.setCapabilityAccess({
        pluginId: 'plugin-b',
        type: PluginCapabilityType.COMMAND,
        name,
        mode: PluginCapabilityMode.RESTRICTED,
        roleIds
      });
    };

    const runSum = async (userId?: number) => {
      const { caller } = await initTest(userId);

      return caller.plugins.executeCommand({
        pluginId: 'plugin-b',
        commandName: 'sum',
        args: { a: 1, b: 2 }
      });
    };

    test('should be usable by default, with nothing configured', async () => {
      expect(await runSum(MODERATOR_USER)).toBeDefined();
    });

    test('should deny a restricted command to a role without a grant', async () => {
      await restrict('sum', [MEMBER_ROLE]);

      await expect(runSum(MODERATOR_USER)).rejects.toThrow(
        'do not have access'
      );
    });

    test('should allow a restricted command to a granted role', async () => {
      await restrict('sum', [MODERATOR_ROLE]);

      expect(await runSum(MODERATOR_USER)).toBeDefined();
    });

    // restricted with nobody selected means nobody, rather than everybody
    test('should deny a restricted command with no roles at all', async () => {
      await restrict('sum', []);

      await expect(runSum(MODERATOR_USER)).rejects.toThrow(
        'do not have access'
      );
    });

    test('should never lock out the owner', async () => {
      await restrict('sum', []);

      expect(await runSum()).toBeDefined();
    });

    test('should apply to actions as well as commands', async () => {
      const { caller: owner } = await initTest();

      await owner.plugins.setCapabilityAccess({
        pluginId: 'plugin-b',
        type: PluginCapabilityType.ACTION,
        name: 'multiply',
        mode: PluginCapabilityMode.RESTRICTED,
        roleIds: []
      });

      const { caller } = await initTest(MODERATOR_USER);

      await expect(
        caller.plugins.executeAction({
          pluginId: 'plugin-b',
          actionName: 'multiply',
          payload: { a: 2, b: 3 }
        })
      ).rejects.toThrow('do not have access');
    });

    test('should go back to public when the mode is reset', async () => {
      await restrict('sum', []);

      const { caller: owner } = await initTest();

      await owner.plugins.setCapabilityAccess({
        pluginId: 'plugin-b',
        type: PluginCapabilityType.COMMAND,
        name: 'sum',
        mode: PluginCapabilityMode.PUBLIC,
        roleIds: []
      });

      expect(await runSum(MODERATOR_USER)).toBeDefined();
    });

    test('should list capabilities with their current access', async () => {
      await restrict('sum', [MODERATOR_ROLE]);

      const { caller } = await initTest();
      const { capabilities } = await caller.plugins.getCapabilities({
        pluginId: 'plugin-b'
      });

      const sum = capabilities.find((c) => c.name === 'sum');

      expect(sum!.mode).toBe(PluginCapabilityMode.RESTRICTED);
      expect(sum!.roleIds).toEqual([MODERATOR_ROLE]);
      expect(
        capabilities.some((c) => c.type === PluginCapabilityType.ACTION)
      ).toBe(true);
    });

    // every test above configures one capability on one plugin. these are about
    // rules bleeding into things they were never meant to touch
    describe('isolation', () => {
      const GUEST_ROLE = 3;

      const restrictAction = async (
        pluginId: string,
        name: string,
        roleIds: number[]
      ) => {
        const { caller } = await initTest();

        await caller.plugins.setCapabilityAccess({
          pluginId,
          type: PluginCapabilityType.ACTION,
          name,
          mode: PluginCapabilityMode.RESTRICTED,
          roleIds
        });
      };

      const restrictCommand = async (
        pluginId: string,
        name: string,
        roleIds: number[]
      ) => {
        const { caller } = await initTest();

        await caller.plugins.setCapabilityAccess({
          pluginId,
          type: PluginCapabilityType.COMMAND,
          name,
          mode: PluginCapabilityMode.RESTRICTED,
          roleIds
        });
      };

      const runCommand = async (
        pluginId: string,
        commandName: string,
        userId: number
      ) => {
        const { caller } = await initTest(userId);

        return caller.plugins.executeCommand({
          pluginId,
          commandName,
          args: { a: 1, b: 2 }
        });
      };

      const runAction = async (
        pluginId: string,
        actionName: string,
        userId: number
      ) => {
        const { caller } = await initTest(userId);

        return caller.plugins.executeAction({
          pluginId,
          actionName,
          payload: { a: 1, b: 2 }
        });
      };

      test('should leave the other commands of the same plugin alone', async () => {
        await restrictCommand('plugin-b', 'sum', []);

        expect(
          await runCommand('plugin-b', 'test-command', MODERATOR_USER)
        ).toBeDefined();
      });

      test('should keep two capabilities configured differently apart', async () => {
        await restrictCommand('plugin-b', 'sum', []);
        await restrictCommand('plugin-b', 'test-command', [MODERATOR_ROLE]);

        await expect(
          runCommand('plugin-b', 'sum', MODERATOR_USER)
        ).rejects.toThrow('do not have access');
        expect(
          await runCommand('plugin-b', 'test-command', MODERATOR_USER)
        ).toBeDefined();
      });

      // plugin-a registers its own 'sum', so the plugin half of the key matters
      test('should not restrict another plugin with the same capability name', async () => {
        await pluginManager.load('plugin-a');

        await restrictCommand('plugin-b', 'sum', []);

        await expect(
          runCommand('plugin-b', 'sum', MODERATOR_USER)
        ).rejects.toThrow('do not have access');
        expect(
          await runCommand('plugin-a', 'sum', MODERATOR_USER)
        ).toBeDefined();
      });

      test('should not carry a rule across to another plugin being configured', async () => {
        await pluginManager.load('plugin-a');

        await restrictCommand('plugin-a', 'sum', []);

        expect(
          await runCommand('plugin-b', 'sum', MODERATOR_USER)
        ).toBeDefined();
      });

      // plugin-b has both a command and an action called 'sum'
      test('should not restrict an action by restricting the command of the same name', async () => {
        await restrictCommand('plugin-b', 'sum', []);

        expect(
          await runAction('plugin-b', 'sum', MODERATOR_USER)
        ).toBeDefined();
      });

      test('should not restrict a command by restricting the action of the same name', async () => {
        await restrictAction('plugin-b', 'sum', []);

        expect(
          await runCommand('plugin-b', 'sum', MODERATOR_USER)
        ).toBeDefined();
      });

      // the rule is any of, so one granted role among several is enough
      test('should allow a user whose other role is the granted one', async () => {
        await tdb.insert(userRoles).values({
          userId: MODERATOR_USER,
          roleId: GUEST_ROLE,
          createdAt: Date.now()
        });

        await restrictCommand('plugin-b', 'sum', [GUEST_ROLE]);

        expect(
          await runCommand('plugin-b', 'sum', MODERATOR_USER)
        ).toBeDefined();
      });

      // the grant rows cascade with the role, which turns the capability into
      // one nobody can reach rather than one everybody can
      test('should deny everyone once the only granted role is deleted', async () => {
        await restrictCommand('plugin-b', 'sum', [GUEST_ROLE]);

        await tdb.insert(userRoles).values({
          userId: MODERATOR_USER,
          roleId: GUEST_ROLE,
          createdAt: Date.now()
        });

        expect(
          await runCommand('plugin-b', 'sum', MODERATOR_USER)
        ).toBeDefined();

        const { caller } = await initTest();

        await caller.roles.delete({ roleId: GUEST_ROLE });

        await expect(
          runCommand('plugin-b', 'sum', MODERATOR_USER)
        ).rejects.toThrow('do not have access');
      });

      test('should deny a user who loses the granted role', async () => {
        await restrictCommand('plugin-b', 'sum', [MODERATOR_ROLE]);

        expect(
          await runCommand('plugin-b', 'sum', MODERATOR_USER)
        ).toBeDefined();

        const { caller } = await initTest();

        await caller.users.removeRole({
          userId: MODERATOR_USER,
          roleId: MODERATOR_ROLE
        });

        await expect(
          runCommand('plugin-b', 'sum', MODERATOR_USER)
        ).rejects.toThrow();
      });
    });

    test('should need the permission to read capabilities', async () => {
      const { caller } = await initTest(MODERATOR_USER);

      await expect(
        caller.plugins.getCapabilities({ pluginId: 'plugin-b' })
      ).rejects.toThrow('Insufficient permissions');
    });

    test('should need the permission to change access', async () => {
      const { caller } = await initTest(MODERATOR_USER);

      await expect(
        caller.plugins.setCapabilityAccess({
          pluginId: 'plugin-b',
          type: PluginCapabilityType.COMMAND,
          name: 'sum',
          mode: PluginCapabilityMode.PUBLIC,
          roleIds: []
        })
      ).rejects.toThrow('Insufficient permissions');
    });

    // plugin-b declares admin-sum as requiring MANAGE_MESSAGES and
    // admin-multiply as requiring MANAGE_USERS. the seeded moderator role holds
    // MANAGE_USERS and MANAGE_ROLES only
    describe('plugin declared defaults', () => {
      const runAdminSum = async (userId?: number) => {
        const { caller } = await initTest(userId);

        return caller.plugins.executeCommand({
          pluginId: 'plugin-b',
          commandName: 'admin-sum',
          args: { a: 1, b: 2 }
        });
      };

      test('should deny a declared command to a user without the permission', async () => {
        await expect(runAdminSum(MODERATOR_USER)).rejects.toThrow(
          'do not have access'
        );
      });

      test('should allow a declared command to a user with the permission', async () => {
        await tdb.insert(rolePermissions).values({
          roleId: MODERATOR_ROLE,
          permission: Permission.MANAGE_MESSAGES,
          createdAt: Date.now()
        });

        expect(await runAdminSum(MODERATOR_USER)).toBeDefined();
      });

      test('should allow the owner regardless of the declaration', async () => {
        expect(await runAdminSum()).toBeDefined();
      });

      test('should apply a declaration to actions too', async () => {
        const { caller } = await initTest(MODERATOR_USER);

        expect(
          await caller.plugins.executeAction({
            pluginId: 'plugin-b',
            actionName: 'admin-multiply',
            payload: { a: 2, b: 3 }
          })
        ).toBeDefined();
      });

      test('should let an admin grant a role the declaration would deny', async () => {
        const { caller: owner } = await initTest();

        await owner.plugins.setCapabilityAccess({
          pluginId: 'plugin-b',
          type: PluginCapabilityType.COMMAND,
          name: 'admin-sum',
          mode: PluginCapabilityMode.RESTRICTED,
          roleIds: [MODERATOR_ROLE]
        });

        expect(await runAdminSum(MODERATOR_USER)).toBeDefined();
      });

      test('should let an admin open a declared capability to everyone', async () => {
        const { caller: owner } = await initTest();

        await owner.plugins.setCapabilityAccess({
          pluginId: 'plugin-b',
          type: PluginCapabilityType.COMMAND,
          name: 'admin-sum',
          mode: PluginCapabilityMode.PUBLIC,
          roleIds: []
        });

        expect(await runAdminSum(MODERATOR_USER)).toBeDefined();
      });

      test('should fall back to the declaration once the config is reset', async () => {
        const { caller: owner } = await initTest();

        await owner.plugins.setCapabilityAccess({
          pluginId: 'plugin-b',
          type: PluginCapabilityType.COMMAND,
          name: 'admin-sum',
          mode: PluginCapabilityMode.PUBLIC,
          roleIds: []
        });

        expect(await runAdminSum(MODERATOR_USER)).toBeDefined();

        await owner.plugins.resetCapabilityAccess({
          pluginId: 'plugin-b',
          type: PluginCapabilityType.COMMAND,
          name: 'admin-sum'
        });

        await expect(runAdminSum(MODERATOR_USER)).rejects.toThrow(
          'do not have access'
        );
      });

      test('should report the declaration and its resolved default', async () => {
        const { caller } = await initTest();
        const { capabilities } = await caller.plugins.getCapabilities({
          pluginId: 'plugin-b'
        });

        const adminSum = capabilities.find((c) => c.name === 'admin-sum');

        expect(adminSum!.requires).toBe(Permission.MANAGE_MESSAGES);
        expect(adminSum!.configured).toBe(false);
        expect(adminSum!.mode).toBe(PluginCapabilityMode.RESTRICTED);
        expect(adminSum!.roleIds).toEqual([]);

        const adminMultiply = capabilities.find(
          (c) => c.name === 'admin-multiply'
        );

        expect(adminMultiply!.requires).toBe(Permission.MANAGE_USERS);
        expect(adminMultiply!.roleIds).toEqual([MODERATOR_ROLE]);
      });

      test('should keep the declared default alongside an admin override', async () => {
        const { caller } = await initTest();

        await caller.plugins.setCapabilityAccess({
          pluginId: 'plugin-b',
          type: PluginCapabilityType.COMMAND,
          name: 'admin-sum',
          mode: PluginCapabilityMode.PUBLIC,
          roleIds: []
        });

        const { capabilities } = await caller.plugins.getCapabilities({
          pluginId: 'plugin-b'
        });

        const adminSum = capabilities.find((c) => c.name === 'admin-sum');

        expect(adminSum!.configured).toBe(true);
        expect(adminSum!.mode).toBe(PluginCapabilityMode.PUBLIC);
        expect(adminSum!.defaultAccess.mode).toBe(
          PluginCapabilityMode.RESTRICTED
        );
      });

      test('should report an undeclared capability as public by default', async () => {
        const { caller } = await initTest();
        const { capabilities } = await caller.plugins.getCapabilities({
          pluginId: 'plugin-b'
        });

        const sum = capabilities.find((c) => c.name === 'sum');

        expect(sum!.requires).toBeUndefined();
        expect(sum!.configured).toBe(false);
        expect(sum!.mode).toBe(PluginCapabilityMode.PUBLIC);
      });

      // plugin-b declares chat_actions as needing MANAGE_MESSAGES, and leaves
      // its other slots undeclared. hiding a component is presentation, so the
      // rules go to every client rather than gating a call
      describe('components', () => {
        const chatActionsRule = async () => {
          const rules = await getCapabilityAccessRules();

          return rules.find(
            (rule) =>
              rule.pluginId === 'plugin-b' &&
              rule.name === PluginSlot.CHAT_ACTIONS
          );
        };

        test('should restrict a declared slot to the roles that qualify', async () => {
          expect((await chatActionsRule())?.roleIds).toEqual([]);

          await tdb.insert(rolePermissions).values({
            roleId: MODERATOR_ROLE,
            permission: Permission.MANAGE_MESSAGES,
            createdAt: Date.now()
          });

          expect((await chatActionsRule())?.roleIds).toEqual([MODERATOR_ROLE]);
        });

        test('should leave an undeclared slot public', async () => {
          const rules = await getCapabilityAccessRules();

          expect(
            rules.some((rule) => rule.name === PluginSlot.TOPBAR_RIGHT)
          ).toBe(false);
        });

        test('should let an admin override a declared slot to public', async () => {
          const { caller } = await initTest();

          await caller.plugins.setCapabilityAccess({
            pluginId: 'plugin-b',
            type: PluginCapabilityType.COMPONENT,
            name: PluginSlot.CHAT_ACTIONS,
            mode: PluginCapabilityMode.PUBLIC,
            roleIds: []
          });

          expect(await chatActionsRule()).toBeUndefined();
        });

        test('should let an admin grant a declared slot to another role', async () => {
          const { caller } = await initTest();

          await caller.plugins.setCapabilityAccess({
            pluginId: 'plugin-b',
            type: PluginCapabilityType.COMPONENT,
            name: PluginSlot.CHAT_ACTIONS,
            mode: PluginCapabilityMode.RESTRICTED,
            roleIds: [MEMBER_ROLE]
          });

          expect((await chatActionsRule())?.roleIds).toEqual([MEMBER_ROLE]);
        });

        test('should fall back to the declaration once reset', async () => {
          const { caller } = await initTest();

          await caller.plugins.setCapabilityAccess({
            pluginId: 'plugin-b',
            type: PluginCapabilityType.COMPONENT,
            name: PluginSlot.CHAT_ACTIONS,
            mode: PluginCapabilityMode.PUBLIC,
            roleIds: []
          });

          expect(await chatActionsRule()).toBeUndefined();

          await caller.plugins.resetCapabilityAccess({
            pluginId: 'plugin-b',
            type: PluginCapabilityType.COMPONENT,
            name: PluginSlot.CHAT_ACTIONS
          });

          expect((await chatActionsRule())?.roleIds).toEqual([]);
        });

        test('should list a declared slot with no stored row', async () => {
          const { caller } = await initTest();
          const { capabilities } = await caller.plugins.getCapabilities({
            pluginId: 'plugin-b'
          });

          const chatActions = capabilities.find(
            (c) => c.name === PluginSlot.CHAT_ACTIONS
          );

          expect(chatActions!.type).toBe(PluginCapabilityType.COMPONENT);
          expect(chatActions!.requires).toBe(Permission.MANAGE_MESSAGES);
          expect(chatActions!.configured).toBe(false);
        });

        test('should send the rules in the connect payload', async () => {
          const { initialData } = await initTest();

          expect(
            initialData.pluginCapabilityAccess.some(
              (rule) => rule.name === PluginSlot.CHAT_ACTIONS
            )
          ).toBe(true);
        });

        test('should drop the declaration when the plugin unloads', async () => {
          await pluginManager.unload('plugin-b');

          expect(await chatActionsRule()).toBeUndefined();
        });
      });

      // the client resolves access from these rules, so they have to answer the
      // same as canUseCapability does for the call itself
      describe('access rules', () => {
        const ruleFor = async (type: PluginCapabilityType, name: string) => {
          const rules = await getCapabilityAccessRules();

          return rules.find(
            (rule) =>
              rule.pluginId === 'plugin-b' &&
              rule.type === type &&
              rule.name === name
          );
        };

        test('should resolve a declared command to the roles that qualify', async () => {
          const rule = await ruleFor(PluginCapabilityType.COMMAND, 'admin-sum');

          expect(rule?.roleIds).toEqual([]);

          await tdb.insert(rolePermissions).values({
            roleId: MODERATOR_ROLE,
            permission: Permission.MANAGE_MESSAGES,
            createdAt: Date.now()
          });

          expect(
            (await ruleFor(PluginCapabilityType.COMMAND, 'admin-sum'))?.roleIds
          ).toEqual([MODERATOR_ROLE]);
        });

        test('should resolve a declared action to the roles that qualify', async () => {
          const rule = await ruleFor(
            PluginCapabilityType.ACTION,
            'admin-multiply'
          );

          expect(rule?.roleIds).toEqual([MODERATOR_ROLE]);
        });

        test('should leave an undeclared capability without a rule', async () => {
          expect(
            await ruleFor(PluginCapabilityType.COMMAND, 'sum')
          ).toBeUndefined();
        });

        // 'sum' is both a command and an action in plugin-b
        test('should keep a restriction to the type it was set on', async () => {
          await restrict('sum', [MODERATOR_ROLE]);

          expect(
            (await ruleFor(PluginCapabilityType.COMMAND, 'sum'))?.roleIds
          ).toEqual([MODERATOR_ROLE]);

          expect(
            await ruleFor(PluginCapabilityType.ACTION, 'sum')
          ).toBeUndefined();
        });

        test('should keep a declaration when the other type of the same name is configured', async () => {
          const { caller } = await initTest();

          await caller.plugins.setCapabilityAccess({
            pluginId: 'plugin-b',
            type: PluginCapabilityType.COMMAND,
            name: 'admin-sum',
            mode: PluginCapabilityMode.PUBLIC,
            roleIds: []
          });

          expect(
            (await ruleFor(PluginCapabilityType.ACTION, 'admin-sum'))?.roleIds
          ).toEqual([MODERATOR_ROLE]);
        });

        test('should let an admin restriction replace the declared default', async () => {
          await restrict('admin-sum', [MEMBER_ROLE]);

          expect(
            (await ruleFor(PluginCapabilityType.COMMAND, 'admin-sum'))?.roleIds
          ).toEqual([MEMBER_ROLE]);
        });

        test('should drop the rule when an admin makes a declared command public', async () => {
          const { caller } = await initTest();

          await caller.plugins.setCapabilityAccess({
            pluginId: 'plugin-b',
            type: PluginCapabilityType.COMMAND,
            name: 'admin-sum',
            mode: PluginCapabilityMode.PUBLIC,
            roleIds: []
          });

          expect(
            await ruleFor(PluginCapabilityType.COMMAND, 'admin-sum')
          ).toBeUndefined();
        });

        // the rules and canUseCapability are two implementations of one
        // precedence, and this is what catches them drifting apart
        test('should agree with canUseCapability', async () => {
          await restrict('sum', [MODERATOR_ROLE]);

          const cases = [
            { type: PluginCapabilityType.COMMAND, name: 'sum' },
            { type: PluginCapabilityType.COMMAND, name: 'admin-sum' },
            { type: PluginCapabilityType.ACTION, name: 'admin-multiply' },
            { type: PluginCapabilityType.ACTION, name: 'sum' }
          ];

          const rules = await getCapabilityAccessRules();

          for (const userId of [1, MODERATOR_USER]) {
            const roleIds = await getUserRoleIds(userId);

            for (const { type, name } of cases) {
              const rule = rules.find(
                (candidate) =>
                  candidate.pluginId === 'plugin-b' &&
                  candidate.type === type &&
                  candidate.name === name
              );

              const allowedByRules =
                roleIds.includes(OWNER_ROLE_ID) ||
                !rule ||
                rule.roleIds.some((roleId) => roleIds.includes(roleId));

              expect({ userId, name, type, allowed: allowedByRules }).toEqual({
                userId,
                name,
                type,
                allowed: await canUseCapability(userId, 'plugin-b', type, name)
              });
            }
          }
        });
      });

      test('should need the permission to reset access', async () => {
        const { caller } = await initTest(MODERATOR_USER);

        await expect(
          caller.plugins.resetCapabilityAccess({
            pluginId: 'plugin-b',
            type: PluginCapabilityType.COMMAND,
            name: 'admin-sum'
          })
        ).rejects.toThrow('Insufficient permissions');
      });
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
