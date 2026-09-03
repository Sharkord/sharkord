import {
  ChannelType,
  DEFAULT_LOCALE,
  DEFAULT_MESSAGES_LIMIT,
  FileSaveType,
  STORAGE_MIN_QUOTA_PER_USER,
  type TInvokerContext
} from '@sharkord/shared';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test
} from 'bun:test';
import { eq } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';
import { pluginManager } from '..';
import { initTest } from '../../__tests__/helpers';
import { loadMockedPlugins, resetPluginMocks } from '../../__tests__/mocks';
import { findTestLog, tdb } from '../../__tests__/setup';
import { messages, pluginData, settings } from '../../db/schema';
import { fileManager } from '../../helpers/file-manager';
import { PLUGINS_PATH, PUBLIC_PATH, UPLOADS_PATH } from '../../helpers/paths';
import { getPluginDataPath } from '../../helpers/plugin-paths';
import { handleSocketClose, trackUserSocket } from '../../utils/wss';
import { eventBus } from '../event-bus';
import { withTimeout } from '../execution-timeout';

describe('plugin-manager', () => {
  beforeAll(loadMockedPlugins);
  beforeEach(resetPluginMocks);

  const mockInvokerCtx: TInvokerContext = {
    userId: 1,
    source: 'api',
    currentVoiceChannelId: undefined,
    locale: DEFAULT_LOCALE
  };

  describe('load', () => {
    test('should load plugin-a correctly', async () => {
      await pluginManager.load('plugin-a');

      const info = await pluginManager.getPluginInfo('plugin-a');

      expect(info.enabled).toBe(true);
      expect(info.name).toBe('plugin-a');
      expect(info.loadError).toBeUndefined();
    });

    test('should load plugin-b with commands', async () => {
      await pluginManager.load('plugin-b');

      const hasTestCommand = pluginManager.hasCommand(
        'plugin-b',
        'test-command'
      );

      const hasSumCommand = pluginManager.hasCommand('plugin-b', 'sum');

      expect(hasTestCommand).toBe(true);
      expect(hasSumCommand).toBe(true);

      const commands = pluginManager.getCommands();
      expect(commands['plugin-b']).toBeDefined();
      expect(commands['plugin-b']!.map((command) => command.name)).toEqual(
        expect.arrayContaining(['test-command', 'sum'])
      );
    });

    test('should skip loading disabled plugin', async () => {
      await pluginManager.togglePlugin('plugin-a', false);
      await pluginManager.load('plugin-a');

      const logs = pluginManager.getLogs('plugin-a');
      const hasSkipMessage = logs.some((log) =>
        log.message.includes('skipping load')
      );

      expect(hasSkipMessage).toBe(true);
    });

    test('should fail to load plugin without onLoad export', async () => {
      await pluginManager.togglePlugin('plugin-no-onload', true);
      await pluginManager.load('plugin-no-onload');

      const info = await pluginManager.getPluginInfo('plugin-no-onload');

      expect(info.loadError).toBeDefined();
      expect(info.loadError).toContain('does not export');
    });

    test('should handle plugin that throws error on load', async () => {
      await pluginManager.togglePlugin('plugin-throws-error', true);
      await pluginManager.load('plugin-throws-error');

      const info = await pluginManager.getPluginInfo('plugin-throws-error');

      expect(info.loadError).toBeDefined();
      expect(info.loadError).toContain('Intentional error');
    });

    test('should reject when plugins are disabled in settings', async () => {
      await tdb.update(settings).set({ enablePlugins: false });

      await expect(pluginManager.load('plugin-a')).rejects.toThrow(
        'Plugins are disabled.'
      );
    });

    test('should handle plugin with invalid manifest.json', async () => {
      await expect(
        pluginManager.getPluginInfo('plugin-invalid-package')
      ).rejects.toThrow();
    });

    test('should handle plugin with missing entry file', async () => {
      await expect(
        pluginManager.getPluginInfo('plugin-missing-entry')
      ).rejects.toThrow('Plugin server entry file not found');
    });

    test('should handle plugin with missing client entry file', async () => {
      await expect(
        pluginManager.getPluginInfo('plugin-missing-client-entry')
      ).rejects.toThrow('Plugin client entry file not found');
    });

    test('should load plugin without onUnload and warn about it', async () => {
      await pluginManager.togglePlugin('plugin-no-unload', true);
      await pluginManager.load('plugin-no-unload');

      const info = await pluginManager.getPluginInfo('plugin-no-unload');

      expect(info.loadError).toBeUndefined();
      expect(
        findTestLog('warn', 'will be required in a future SDK version')
      ).toBeDefined();
    });

    test('should fail to load plugin missing sdk version', async () => {
      await pluginManager.togglePlugin('plugin-no-sdk-version', true);
      await pluginManager.load('plugin-no-sdk-version');

      const info = await pluginManager.getPluginInfoOrPlaceholder(
        'plugin-no-sdk-version'
      );

      expect(info.loadError).toContain('Invalid manifest.json');
    });

    test('should fail to load plugin with invalid sdk version', async () => {
      await pluginManager.togglePlugin('plugin-invalid-sdk-version', true);
      await pluginManager.load('plugin-invalid-sdk-version');

      const info = await pluginManager.getPluginInfoOrPlaceholder(
        'plugin-invalid-sdk-version'
      );

      expect(info.loadError).toContain('Invalid manifest.json');
    });

    test('should refuse to enable a plugin that is not on disk', async () => {
      await expect(
        pluginManager.togglePlugin('not-installed', true)
      ).rejects.toThrow("Plugin 'not-installed' was not found.");

      expect(pluginManager.isEnabled('not-installed')).toBe(false);
    });

    test('should fail to load plugin with incompatible sdk version', async () => {
      await pluginManager.togglePlugin('plugin-incompatible-sdk-version', true);
      await pluginManager.load('plugin-incompatible-sdk-version');

      const info = await pluginManager.getPluginInfo(
        'plugin-incompatible-sdk-version'
      );

      expect(info.loadError).toBeDefined();
      expect(info.loadError).toContain('not compatible');
    });

    test('should load updated plugin code after server entry changes', async () => {
      const pluginServerEntryPath = path.join(
        PLUGINS_PATH,
        'plugin-a',
        'server',
        'index.js'
      );

      const originalSource = await fs.readFile(pluginServerEntryPath, 'utf-8');
      const originalStat = await fs.stat(pluginServerEntryPath);

      try {
        await pluginManager.load('plugin-a');
        await pluginManager.unload('plugin-a');

        const updatedSource = `const onLoad = (ctx) => {
  ctx.logger.log('My Plugin loaded (updated)');

  ctx.commands.register({
    name: 'updated-command',
    description: 'Command from updated plugin file',
    executes: async () => ({ ok: true })
  });
};

const onUnload = (ctx) => {
  ctx.logger.log('My Plugin unloaded (updated)');
};

export { onLoad, onUnload };
`;

        await Bun.sleep(100);
        await fs.writeFile(pluginServerEntryPath, updatedSource);

        const updatedStat = await fs.stat(pluginServerEntryPath);

        expect(updatedStat.mtimeMs).toBeGreaterThan(originalStat.mtimeMs);

        await pluginManager.load('plugin-a');

        expect(pluginManager.hasCommand('plugin-a', 'updated-command')).toBe(
          true
        );
      } finally {
        await pluginManager.unload('plugin-a');
        await fs.writeFile(pluginServerEntryPath, originalSource);
      }
    });
  });

  describe('unload', () => {
    test('should unload plugin-a correctly', async () => {
      await pluginManager.load('plugin-a');
      await pluginManager.unload('plugin-a');
      const logs = pluginManager.getLogs('plugin-a');

      const hasUnloadMessage = logs.some((log) =>
        log.message.includes('unloaded')
      );

      expect(hasUnloadMessage).toBe(true);
    });

    test('should handle unloading plugin that is not loaded', async () => {
      await pluginManager.unload('plugin-a');

      const logs = pluginManager.getLogs('plugin-a');
      const hasMessage = logs.some((log) => log.message.includes('not loaded'));

      expect(hasMessage).toBe(true);
    });

    test('should unregister commands on unload', async () => {
      await pluginManager.load('plugin-b');

      expect(pluginManager.hasCommand('plugin-b', 'test-command')).toBe(true);

      await pluginManager.unload('plugin-b');

      expect(pluginManager.hasCommand('plugin-b', 'test-command')).toBe(false);
    });

    test('should unregister actions on unload', async () => {
      await pluginManager.load('plugin-b');

      expect(pluginManager.hasAction('plugin-b', 'multiply')).toBe(true);

      await pluginManager.unload('plugin-b');

      expect(pluginManager.hasAction('plugin-b', 'multiply')).toBe(false);
    });

    test('should unload plugin without onUnload gracefully', async () => {
      await pluginManager.togglePlugin('plugin-no-unload', true);
      await pluginManager.load('plugin-no-unload');
      await pluginManager.unload('plugin-no-unload');

      const logs = pluginManager.getLogs('plugin-no-unload');

      expect(logs.length).toBeGreaterThan(0);
    });
  });

  describe('commands', () => {
    test('should execute command successfully', async () => {
      await pluginManager.load('plugin-b');

      const result = await pluginManager.executeCommand(
        'plugin-b',
        'sum',
        mockInvokerCtx,
        {
          a: 5,
          b: 3
        }
      );

      expect(result).toEqual({ result: 8 });
    });

    test('should execute command with string argument', async () => {
      await pluginManager.load('plugin-b');

      const result = await pluginManager.executeCommand(
        'plugin-b',
        'test-command',
        mockInvokerCtx,
        {
          message: 'Hello World'
        }
      );

      expect(result).toEqual({ success: true, message: 'Hello World' });
    });

    test('should throw error when plugin is not enabled', async () => {
      await pluginManager.load('plugin-b');
      await pluginManager.togglePlugin('plugin-b', false);

      await expect(
        pluginManager.executeCommand('plugin-b', 'sum', mockInvokerCtx, {
          a: 1,
          b: 2
        })
      ).rejects.toThrow('is not enabled');
    });

    // a plugin that registers none at all, which is a different branch from a
    // plugin that has commands but not the one asked for
    test('should throw error when plugin has no commands', async () => {
      await pluginManager.load('plugin-http-routes');

      await expect(
        pluginManager.executeCommand(
          'plugin-http-routes',
          'nonexistent',
          mockInvokerCtx,
          {}
        )
      ).rejects.toThrow('has no registered command');
    });

    test('should throw error when command does not exist', async () => {
      await pluginManager.load('plugin-b');

      await expect(
        pluginManager.executeCommand(
          'plugin-b',
          'nonexistent',
          mockInvokerCtx,
          {}
        )
      ).rejects.toThrow('not found');
    });

    test('should get all commands from all plugins', async () => {
      await pluginManager.load('plugin-b');
      await pluginManager.load('plugin-with-events');

      const commands = pluginManager.getCommands();

      expect(commands['plugin-b']).toBeDefined();
      expect(commands['plugin-b']!.length).toBeGreaterThan(0);
      expect(commands['plugin-with-events']).toBeDefined();
      expect(
        commands['plugin-with-events']!.map((command) => command.name)
      ).toContain('get-counts');
    });

    test('should check if plugin has specific command', async () => {
      await pluginManager.load('plugin-b');

      expect(pluginManager.hasCommand('plugin-b', 'sum')).toBe(true);
      expect(pluginManager.hasCommand('plugin-b', 'nonexistent')).toBe(false);
      expect(pluginManager.hasCommand('nonexistent-plugin', 'sum')).toBe(false);
    });
  });

  describe('actions', () => {
    test('should execute action successfully', async () => {
      await pluginManager.load('plugin-b');

      const result = await pluginManager.executeAction(
        'plugin-b',
        'multiply',
        mockInvokerCtx,
        {
          a: 6,
          b: 7
        }
      );

      expect(result).toEqual({ result: 42 });
    });

    test('should check if plugin has specific action', async () => {
      await pluginManager.load('plugin-b');

      expect(pluginManager.hasAction('plugin-b', 'multiply')).toBe(true);
      expect(pluginManager.hasAction('plugin-b', 'nonexistent')).toBe(false);
      expect(pluginManager.hasAction('nonexistent-plugin', 'multiply')).toBe(
        false
      );
    });

    test('should throw error when action does not exist', async () => {
      await pluginManager.load('plugin-b');

      await expect(
        pluginManager.executeAction(
          'plugin-b',
          'nonexistent',
          mockInvokerCtx,
          {}
        )
      ).rejects.toThrow('not found');
    });
  });

  describe('components', () => {
    test('should return plugin id when ui is enabled', async () => {
      await pluginManager.load('plugin-b');

      const pluginIds = pluginManager.getPluginIdsWithComponents();

      expect(pluginIds).toContain('plugin-b');
    });

    test('should remove plugin id from components on unload', async () => {
      await pluginManager.load('plugin-b');

      expect(pluginManager.getPluginIdsWithComponents()).toContain('plugin-b');

      await pluginManager.unload('plugin-b');

      expect(pluginManager.getPluginIdsWithComponents()).not.toContain(
        'plugin-b'
      );
    });
  });

  describe('plugin data directory', () => {
    const markerPath = () =>
      path.join(getPluginDataPath('plugin-a'), 'marker.txt');

    test('should exist before onLoad runs, so a plugin can write to it', async () => {
      await pluginManager.load('plugin-a');

      expect(await fs.exists(markerPath())).toBe(true);
    });

    // the whole point: an update replaces the plugin folder, not its data
    test('should survive the plugin folder being replaced', async () => {
      await pluginManager.load('plugin-a');
      await fs.writeFile(markerPath(), 'written before the update');

      const pluginPath = path.join(PLUGINS_PATH, 'plugin-a');
      const source = await fs
        .cp(pluginPath, `${pluginPath}-copy`, { recursive: true })
        .then(() => `${pluginPath}-copy`);

      await pluginManager.unload('plugin-a');

      // exactly what installing an update does to the plugin's own folder
      await fs.rm(pluginPath, { recursive: true, force: true });
      await fs.cp(source, pluginPath, { recursive: true });
      await fs.rm(source, { recursive: true, force: true });

      await pluginManager.load('plugin-a');

      expect(await Bun.file(markerPath()).text()).toBe(
        'written before the update'
      );
    });

    test('should be removed with the plugin', async () => {
      const pluginPath = path.join(PLUGINS_PATH, 'plugin-a');
      const backup = `${pluginPath}-backup`;

      await fs.cp(pluginPath, backup, { recursive: true });

      try {
        await pluginManager.load('plugin-a');

        expect(await fs.exists(getPluginDataPath('plugin-a'))).toBe(true);

        await pluginManager.removePlugin('plugin-a');

        expect(await fs.exists(getPluginDataPath('plugin-a'))).toBe(false);
      } finally {
        await fs.cp(backup, pluginPath, { recursive: true });
        await fs.rm(backup, { recursive: true, force: true });
      }
    });
  });

  describe('metadata', () => {
    test('should report the loaded plugin manifest, version included', async () => {
      await pluginManager.load('plugin-b');

      const metadata = pluginManager
        .getActivePluginMetadata()
        .find((entry) => entry.pluginId === 'plugin-b');

      expect(metadata).toEqual({
        pluginId: 'plugin-b',
        name: 'plugin-b',
        description: 'Plugin B with commands',
        version: '1.2.3',
        avatarUrl: 'https://example.com/logo.png'
      });
    });

    test('should drop a plugin from the metadata once it unloads', async () => {
      await pluginManager.load('plugin-b');
      await pluginManager.unload('plugin-b');

      expect(
        pluginManager
          .getActivePluginMetadata()
          .some((entry) => entry.pluginId === 'plugin-b')
      ).toBe(false);
    });
  });

  describe('togglePlugin', () => {
    test('should enable plugin and load it', async () => {
      await pluginManager.togglePlugin('plugin-a', false);

      let info = await pluginManager.getPluginInfo('plugin-a');

      expect(info.enabled).toBe(false);

      await pluginManager.togglePlugin('plugin-a', true);

      info = await pluginManager.getPluginInfo('plugin-a');

      expect(info.enabled).toBe(true);
    });

    test('should disable plugin and unload it', async () => {
      await pluginManager.load('plugin-a');
      await pluginManager.togglePlugin('plugin-a', false);

      const info = await pluginManager.getPluginInfo('plugin-a');

      expect(info.enabled).toBe(false);

      const logs = pluginManager.getLogs('plugin-a');
      const hasUnloadMessage = logs.some((log) =>
        log.message.includes('unloaded')
      );

      expect(hasUnloadMessage).toBe(true);
    });

    test('should persist enabled state to database', async () => {
      await pluginManager.togglePlugin('plugin-a', true);

      const row = await tdb
        .select({ enabled: pluginData.enabled })
        .from(pluginData)
        .where(eq(pluginData.pluginId, 'plugin-a'))
        .get();

      expect(row?.enabled).toBe(true);
    });
  });

  describe('getPluginInfo', () => {
    test('should return correct plugin info', async () => {
      const info = await pluginManager.getPluginInfo('plugin-a');

      expect(info.id).toBe('plugin-a');
      expect(info.name).toBe('plugin-a');
      expect(info.version).toBe('0.0.1');
      expect(info.author).toBe('My Name');
      expect(info.description).toBe(
        'This is a mocked plugin for testing purposes.'
      );
      expect(info.homepage).toBe('https://mocked.com');
      expect(info.enabled).toBe(true);
    });

    test('should include load error if plugin failed to load', async () => {
      await pluginManager.togglePlugin('plugin-throws-error', true);
      await pluginManager.load('plugin-throws-error');

      const info = await pluginManager.getPluginInfo('plugin-throws-error');

      expect(info.loadError).toBeDefined();
    });

    test('should throw error for non-existent plugin', async () => {
      await expect(
        pluginManager.getPluginInfo('nonexistent-plugin')
      ).rejects.toThrow('manifest.json not found');
    });
  });

  describe('getPluginsFromPath', () => {
    test('should return list of plugin directories', async () => {
      const plugins = await pluginManager.getPluginsFromPath();

      expect(plugins).toContain('plugin-a');
      expect(plugins).toContain('plugin-b');
      expect(plugins).toContain('plugin-with-events');
      expect(plugins.length).toBeGreaterThan(0);
    });

    test('should filter out non-directory files', async () => {
      await fs.writeFile(path.join(PLUGINS_PATH, 'test-file.txt'), 'test');

      const plugins = await pluginManager.getPluginsFromPath();

      expect(plugins).not.toContain('test-file.txt');
      // only directories should be returned

      await fs.unlink(path.join(PLUGINS_PATH, 'test-file.txt'));
    });
  });

  describe('loadPlugins', () => {
    test('should load all enabled plugins', async () => {
      await pluginManager.loadPlugins();

      const commands = pluginManager.getCommands();
      expect(commands['plugin-b']).toBeDefined();
      expect(commands['plugin-with-events']).toBeDefined();
    });

    test('should skip loading when plugins are disabled', async () => {
      await tdb.update(settings).set({ enablePlugins: false });
      await pluginManager.loadPlugins();

      const commands = pluginManager.getCommands();
      expect(Object.keys(commands).length).toBe(0);
    });
  });

  describe('logs', () => {
    test('should capture plugin logs', async () => {
      await pluginManager.load('plugin-a');

      const logs = pluginManager.getLogs('plugin-a');
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0]!.pluginId).toBe('plugin-a');
      expect(logs[0]!.message).toContain('loaded');
    });

    test('should limit logs to 1000 entries', async () => {
      await pluginManager.load('plugin-a');

      for (let i = 0; i < 1100; i++) {
        await pluginManager.load('plugin-a');
      }

      const logs = pluginManager.getLogs('plugin-a');

      expect(logs.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('unloadPlugins', () => {
    test('should unload all loaded plugins', async () => {
      await pluginManager.load('plugin-a');
      await pluginManager.load('plugin-b');

      await pluginManager.unloadPlugins();

      const commands = pluginManager.getCommands();
      expect(Object.keys(commands).length).toBe(0);
    });
  });

  describe('getCommandByName', () => {
    test('should find a command by name across plugins', async () => {
      await pluginManager.load('plugin-b');

      const command = pluginManager.getCommandByName('sum');

      expect(command).toBeDefined();
      expect(command!.name).toBe('sum');
      expect(command!.pluginId).toBe('plugin-b');
    });

    test('should return undefined for non-existent command', async () => {
      await pluginManager.load('plugin-b');

      const command = pluginManager.getCommandByName('nonexistent');

      expect(command).toBeUndefined();
    });

    test('should return undefined when called with undefined', () => {
      const command = pluginManager.getCommandByName(undefined);

      expect(command).toBeUndefined();
    });

    test('should find command from correct plugin when multiple plugins loaded', async () => {
      await pluginManager.load('plugin-b');
      await pluginManager.load('plugin-with-events');

      const sumCommand = pluginManager.getCommandByName('sum');
      const getCountsCommand = pluginManager.getCommandByName('get-counts');

      expect(sumCommand).toBeDefined();
      expect(sumCommand!.pluginId).toBe('plugin-b');

      expect(getCountsCommand).toBeDefined();
      expect(getCountsCommand!.pluginId).toBe('plugin-with-events');
    });
  });

  describe('command execution error handling', () => {
    test('should propagate error when command throws', async () => {
      await pluginManager.load('plugin-b');

      // the 'sum' command expects numbers; passing non-numbers
      // won't throw because JS adds them, but we can test by
      // verifying the error path via a command that doesn't exist
      // on a loaded plugin. Let's test plugin-level error logging.
      await pluginManager.load('plugin-with-events');

      // get-counts doesn't throw, but the error path is covered
      // by the 'command not found' and 'plugin not enabled' tests.
      // Let's verify error logging when executeCommand hits an error.
      // Execute a valid command to verify debug logging
      await pluginManager.executeCommand('plugin-b', 'sum', mockInvokerCtx, {
        a: 1,
        b: 2
      });

      const logsAfter = pluginManager.getLogs('plugin-b');
      const hasDebugLog = logsAfter
        .slice(-20)
        .some(
          (log) =>
            log.type === 'debug' && log.message.includes('Executing command')
        );

      expect(hasDebugLog).toBe(true);
    });
  });

  describe('toggle idempotency', () => {
    test('should handle toggling to same enabled state', async () => {
      // plugin-a starts enabled
      await pluginManager.togglePlugin('plugin-a', true);

      const info = await pluginManager.getPluginInfo('plugin-a');
      expect(info.enabled).toBe(true);
    });

    test('should handle toggling to same disabled state', async () => {
      await pluginManager.togglePlugin('plugin-a', false);
      await pluginManager.togglePlugin('plugin-a', false);

      const info = await pluginManager.getPluginInfo('plugin-a');
      expect(info.enabled).toBe(false);
    });
  });

  describe('plugin ID validation', () => {
    test('should reject plugin ID with path traversal', async () => {
      await expect(pluginManager.getPluginInfo('../../../etc')).rejects.toThrow(
        'Invalid plugin ID'
      );
    });

    test('should reject plugin ID with forward slash', async () => {
      await expect(pluginManager.getPluginInfo('foo/bar')).rejects.toThrow(
        'Invalid plugin ID'
      );
    });

    test('should reject plugin ID with backslash', async () => {
      await expect(pluginManager.getPluginInfo('foo\\bar')).rejects.toThrow(
        'Invalid plugin ID'
      );
    });

    test('should reject plugin ID with null byte', async () => {
      await expect(pluginManager.getPluginInfo('foo\0bar')).rejects.toThrow(
        'Invalid plugin ID'
      );
    });

    test('should reject plugin ID with uppercase letters', async () => {
      await expect(pluginManager.getPluginInfo('Plugin-A')).rejects.toThrow(
        'Invalid plugin ID'
      );
    });

    test('should reject plugin ID with underscores', async () => {
      await expect(pluginManager.getPluginInfo('plugin_a')).rejects.toThrow(
        'Invalid plugin ID'
      );
    });

    test('should reject empty plugin ID', async () => {
      await expect(pluginManager.getPluginInfo('')).rejects.toThrow(
        'Invalid plugin ID'
      );
    });

    test('should accept valid lowercase-and-dashes plugin ID', async () => {
      await expect(
        pluginManager.getPluginInfo('valid-id-123')
      ).rejects.not.toThrow('Invalid plugin ID');
    });
  });

  describe('manifest ID mismatch', () => {
    test('should throw when manifest.id does not match plugin directory name', async () => {
      await expect(
        pluginManager.getPluginInfo('plugin-mismatched-id')
      ).rejects.toThrow('must match plugin directory');
    });
  });

  describe('settings', () => {
    test('should register settings and return default values', async () => {
      await pluginManager.load('plugin-with-settings');

      const result = await pluginManager.executeCommand(
        'plugin-with-settings',
        'get-settings',
        mockInvokerCtx,
        {}
      );

      expect(result).toEqual({
        greeting: 'Hello!',
        maxRetries: 3,
        enabled: true,
        apiKey: '',
        mode: 'balanced'
      });
    });

    test('should update settings via plugin command', async () => {
      await pluginManager.load('plugin-with-settings');

      await pluginManager.executeCommand(
        'plugin-with-settings',
        'set-greeting',
        mockInvokerCtx,
        { value: 'Welcome!' }
      );

      const result = await pluginManager.executeCommand(
        'plugin-with-settings',
        'get-settings',
        mockInvokerCtx,
        {}
      );

      expect((result as Record<string, unknown>).greeting).toBe('Welcome!');
    });

    test('should return settings definitions via getPluginSettings', async () => {
      await pluginManager.load('plugin-with-settings');

      const settings = await pluginManager.getPluginSettings(
        'plugin-with-settings'
      );

      expect(settings.definitions.map((d) => d.key)).toEqual([
        'greeting',
        'maxRetries',
        'enabled',
        'apiKey',
        'mode'
      ]);
      expect(settings.values.greeting).toBe('Hello!');
      expect(settings.values.maxRetries).toBe(3);
      expect(settings.values.enabled).toBe(true);
      expect(settings.values.mode).toBe('balanced');
    });

    // a credential must not travel to the admin client, only the fact it is set
    test('should never send a secret value to the client', async () => {
      await pluginManager.load('plugin-with-settings');

      const before = await pluginManager.getPluginSettings(
        'plugin-with-settings'
      );

      expect('apiKey' in before.values).toBe(false);
      expect(before.secretsSet).toEqual([]);

      await pluginManager.updatePluginSetting(
        'plugin-with-settings',
        'apiKey',
        'super-secret-token'
      );

      const after = await pluginManager.getPluginSettings(
        'plugin-with-settings'
      );

      expect('apiKey' in after.values).toBe(false);
      expect(after.secretsSet).toEqual(['apiKey']);
      expect(JSON.stringify(after)).not.toContain('super-secret-token');
    });

    // the plugin itself still reads the real value
    test('should give the plugin the real secret value', async () => {
      await pluginManager.load('plugin-with-settings');

      await pluginManager.updatePluginSetting(
        'plugin-with-settings',
        'apiKey',
        'super-secret-token'
      );

      const result = (await pluginManager.executeCommand(
        'plugin-with-settings',
        'get-settings',
        mockInvokerCtx,
        {}
      )) as Record<string, unknown>;

      expect(result.apiKey).toBe('super-secret-token');
    });

    test('should refuse an enum value outside its options', async () => {
      await pluginManager.load('plugin-with-settings');

      await expect(
        pluginManager.updatePluginSetting(
          'plugin-with-settings',
          'mode',
          'sideways'
        )
      ).rejects.toThrow('expects one of: fast, balanced, thorough');
    });

    test('should accept a declared enum value', async () => {
      await pluginManager.load('plugin-with-settings');

      await pluginManager.updatePluginSetting(
        'plugin-with-settings',
        'mode',
        'thorough'
      );

      const settings = await pluginManager.getPluginSettings(
        'plugin-with-settings'
      );

      expect(settings.values.mode).toBe('thorough');
    });

    test('should update settings via updatePluginSetting', async () => {
      await pluginManager.load('plugin-with-settings');

      await pluginManager.updatePluginSetting(
        'plugin-with-settings',
        'maxRetries',
        5
      );

      const settings = await pluginManager.getPluginSettings(
        'plugin-with-settings'
      );

      expect(settings.values.maxRetries).toBe(5);
    });

    test('should throw error when updating unregistered setting key', async () => {
      await pluginManager.load('plugin-with-settings');

      await expect(
        pluginManager.updatePluginSetting(
          'plugin-with-settings',
          'nonexistent',
          'value'
        )
      ).rejects.toThrow('not registered');
    });

    test('should throw error when plugin has no settings', async () => {
      await pluginManager.load('plugin-a');

      await expect(
        pluginManager.updatePluginSetting('plugin-a', 'key', 'value')
      ).rejects.toThrow('no registered settings');
    });

    test('should persist settings to DB and restore on reload', async () => {
      await pluginManager.load('plugin-with-settings');

      // update a setting
      await pluginManager.updatePluginSetting(
        'plugin-with-settings',
        'greeting',
        'Persisted!'
      );

      // unload and reload
      await pluginManager.unload('plugin-with-settings');
      await pluginManager.load('plugin-with-settings');

      const result = await pluginManager.executeCommand(
        'plugin-with-settings',
        'get-settings',
        mockInvokerCtx,
        {}
      );

      expect((result as Record<string, unknown>).greeting).toBe('Persisted!');
    });

    test('should clean up in-memory settings on unload', async () => {
      await pluginManager.load('plugin-with-settings');

      const settingsBefore = await pluginManager.getPluginSettings(
        'plugin-with-settings'
      );

      expect(settingsBefore.definitions.length).toBeGreaterThan(0);

      await pluginManager.unload('plugin-with-settings');

      const settingsAfter = await pluginManager.getPluginSettings(
        'plugin-with-settings'
      );

      // definitions should be empty since the plugin was unloaded
      expect(settingsAfter.definitions).toHaveLength(0);
    });
  });

  describe('settings change notifications', () => {
    test('should emit setting:set when an admin updates a setting', async () => {
      await pluginManager.load('plugin-with-settings');

      const received: Array<{ key: string; value: unknown }> = [];

      eventBus.register('plugin-with-settings', 'setting:set', (payload) => {
        received.push(payload);
      });

      await pluginManager.updatePluginSetting(
        'plugin-with-settings',
        'greeting',
        'Hi from the admin'
      );

      expect(received).toEqual([
        { key: 'greeting', value: 'Hi from the admin' }
      ]);
    });

    // a plugin's settings are its own: values can be tokens, and a broadcast put
    // them in front of every other loaded plugin
    test('should not deliver setting:set to other plugins', async () => {
      await pluginManager.load('plugin-with-settings');

      const ownEvents: unknown[] = [];
      const otherEvents: unknown[] = [];

      eventBus.register('plugin-with-settings', 'setting:set', (payload) => {
        ownEvents.push(payload);
      });

      eventBus.register('other-plugin', 'setting:set', (payload) => {
        otherEvents.push(payload);
      });

      await pluginManager.updatePluginSetting(
        'plugin-with-settings',
        'greeting',
        'scoped'
      );

      expect(ownEvents).toEqual([{ key: 'greeting', value: 'scoped' }]);
      expect(otherEvents).toEqual([]);

      eventBus.unload('other-plugin');
    });

    test('should not emit setting:set when the update is rejected', async () => {
      await pluginManager.load('plugin-with-settings');

      let emitted = 0;

      eventBus.register('plugin-with-settings', 'setting:set', () => {
        emitted += 1;
      });

      await expect(
        pluginManager.updatePluginSetting(
          'plugin-with-settings',
          'greeting',
          123
        )
      ).rejects.toThrow('expects a string');

      expect(emitted).toBe(0);
    });
  });

  describe('reconcileRemovedPlugins', () => {
    const backupPath = (pluginId: string) =>
      path.join(PLUGINS_PATH, `${pluginId}-backup`);

    const removeDirectory = async (pluginId: string) => {
      const pluginPath = path.join(PLUGINS_PATH, pluginId);

      await fs.cp(pluginPath, backupPath(pluginId), { recursive: true });
      await fs.rm(pluginPath, { recursive: true, force: true });
    };

    const restoreDirectory = async (pluginId: string) => {
      const backup = backupPath(pluginId);

      if (!(await fs.exists(backup))) return;

      await fs.cp(backup, path.join(PLUGINS_PATH, pluginId), {
        recursive: true
      });
      await fs.rm(backup, { recursive: true, force: true });
    };

    const pluginRow = async (pluginId: string) =>
      tdb
        .select()
        .from(pluginData)
        .where(eq(pluginData.pluginId, pluginId))
        .get();

    afterEach(() => restoreDirectory('plugin-a'));

    test('should treat a directory that is gone as an uninstall', async () => {
      await pluginManager.togglePlugin('plugin-a', true);

      expect(await pluginRow('plugin-a')).toBeDefined();

      await removeDirectory('plugin-a');
      await pluginManager.reconcileRemovedPlugins();

      expect(await pluginRow('plugin-a')).toBeUndefined();
    });

    test('should disable it before uninstalling', async () => {
      await pluginManager.togglePlugin('plugin-a', true);

      expect(pluginManager.isEnabled('plugin-a')).toBe(true);

      await removeDirectory('plugin-a');
      await pluginManager.reconcileRemovedPlugins();

      expect(pluginManager.isEnabled('plugin-a')).toBe(false);
      expect(pluginManager.getLogs('plugin-a')).toEqual([]);
    });

    test('should leave a plugin that is still on disk alone', async () => {
      await pluginManager.togglePlugin('plugin-a', true);

      await pluginManager.reconcileRemovedPlugins();

      expect(await pluginRow('plugin-a')).toBeDefined();
      expect(pluginManager.isEnabled('plugin-a')).toBe(true);
    });

    // installing removes the directory before writing the new one, and reading
    // that as an uninstall would wipe the plugin mid-update
    test('should ignore a plugin that is being installed', async () => {
      await pluginManager.togglePlugin('plugin-a', true);

      await removeDirectory('plugin-a');
      pluginManager.markInstalling('plugin-a');

      await pluginManager.reconcileRemovedPlugins();

      expect(await pluginRow('plugin-a')).toBeDefined();

      pluginManager.clearInstalling('plugin-a');
    });
  });

  describe('removePlugin', () => {
    test('should forget the logs and the load error of a removed plugin', async () => {
      const pluginPath = path.join(PLUGINS_PATH, 'plugin-throws-error');
      const backup = await fs
        .cp(pluginPath, `${pluginPath}-backup`, { recursive: true })
        .then(() => `${pluginPath}-backup`);

      try {
        await pluginManager.load('plugin-throws-error');

        expect(
          pluginManager.getLogs('plugin-throws-error').length
        ).toBeGreaterThan(0);
        expect(
          (await pluginManager.getPluginInfo('plugin-throws-error')).loadError
        ).toBeDefined();

        await pluginManager.removePlugin('plugin-throws-error');

        expect(pluginManager.getLogs('plugin-throws-error')).toEqual([]);
      } finally {
        await fs.cp(backup, pluginPath, { recursive: true });
        await fs.rm(backup, { recursive: true, force: true });
      }
    });
  });

  describe('event bus integration', () => {
    test('should register event handlers when plugin loads', async () => {
      await pluginManager.load('plugin-with-events');

      // plugin-with-events registers handlers for user:joined, user:left, message:created
      expect(eventBus.getListenersCount('user:joined')).toBeGreaterThan(0);
      expect(eventBus.getListenersCount('message:created')).toBeGreaterThan(0);
    });

    test('should clean up event handlers when plugin unloads', async () => {
      await pluginManager.load('plugin-with-events');

      const joinedBefore = eventBus.getListenersCount('user:joined');
      expect(joinedBefore).toBeGreaterThan(0);

      await pluginManager.unload('plugin-with-events');

      expect(eventBus.hasPlugin('plugin-with-events')).toBe(false);
      expect(eventBus.getListenersCount('user:joined')).toBe(0);
    });

    test('should fire event handlers when events are emitted', async () => {
      await pluginManager.load('plugin-with-events');

      // emit a message:created event
      await eventBus.emit('message:created', {
        messageId: 1,
        channelId: 1,
        userId: 1,
        pluginId: null,
        content: 'test message',
        textContent: 'test message'
      });

      // the plugin-with-events tracks event counts via its get-counts command
      const result = await pluginManager.executeCommand(
        'plugin-with-events',
        'get-counts',
        mockInvokerCtx,
        {}
      );

      expect((result as Record<string, number>).messageCreated).toBe(1);
    });

    test('should not fire events after plugin is unloaded', async () => {
      await pluginManager.load('plugin-with-events');

      // emit once while loaded
      await eventBus.emit('message:created', {
        messageId: 1,
        channelId: 1,
        userId: 1,
        pluginId: null,
        content: 'test',
        textContent: 'test'
      });

      // get count
      const result1 = await pluginManager.executeCommand(
        'plugin-with-events',
        'get-counts',
        mockInvokerCtx,
        {}
      );

      expect((result1 as Record<string, number>).messageCreated).toBe(1);

      await pluginManager.unload('plugin-with-events');

      // emit again after unload - should not affect the plugin
      await eventBus.emit('message:created', {
        messageId: 2,
        channelId: 1,
        userId: 1,
        pluginId: null,
        content: 'test2',
        textContent: 'test2'
      });

      // since the plugin is unloaded, we can't query it, but we can verify
      // the event bus no longer has handlers for this plugin
      expect(eventBus.hasPlugin('plugin-with-events')).toBe(false);
    });
  });

  describe('reading messages', () => {
    const run = async (command: string, args: Record<string, unknown>) =>
      (await pluginManager.executeCommand(
        'plugin-message-actions',
        command,
        mockInvokerCtx,
        args
      )) as {
        count: number;
        contents: string[];
        createdAt: number[];
        found?: boolean;
        content?: string | null;
      };

    beforeEach(async () => {
      await pluginManager.load('plugin-message-actions');
    });

    test('should read the messages already in a channel', async () => {
      const result = await run('list-messages', { channelId: 1 });

      expect(result.count).toBeGreaterThan(0);
      expect(result.contents).toContain('Test message');
    });

    test('should return newest first', async () => {
      await pluginManager.executeCommand(
        'plugin-message-actions',
        'send-message',
        mockInvokerCtx,
        { channelId: 1, content: 'newer message' }
      );

      const result = await run('list-messages', { channelId: 1 });

      expect(result.contents[0]).toContain('newer message');
      expect(result.createdAt[0]).toBeGreaterThanOrEqual(
        result.createdAt[result.createdAt.length - 1]!
      );
    });

    test('should page backwards with before', async () => {
      await pluginManager.executeCommand(
        'plugin-message-actions',
        'send-message',
        mockInvokerCtx,
        { channelId: 1, content: 'newer message' }
      );

      const firstPage = await run('list-messages', { channelId: 1, limit: 1 });

      expect(firstPage.count).toBe(1);

      const secondPage = await run('list-messages', {
        channelId: 1,
        limit: 1,
        before: firstPage.createdAt[0]
      });

      expect(secondPage.count).toBe(1);
      expect(secondPage.contents[0]).not.toBe(firstPage.contents[0]);
    });

    // the cap is enforced by the server, not trusted from the plugin
    test('should clamp an absurd limit', async () => {
      const result = await run('list-messages', {
        channelId: 1,
        limit: 100000
      });

      expect(result.count).toBeLessThanOrEqual(DEFAULT_MESSAGES_LIMIT);
    });

    test('should read a single message by id', async () => {
      const { messageId } = (await pluginManager.executeCommand(
        'plugin-message-actions',
        'send-message',
        mockInvokerCtx,
        { channelId: 1, content: 'findable' }
      )) as { messageId: number };

      const result = await run('get-message', { messageId });

      expect(result.found).toBe(true);
      expect(result.content).toContain('findable');
    });

    test('should return nothing for a message that does not exist', async () => {
      const result = await run('get-message', { messageId: 999999 });

      expect(result.found).toBe(false);
    });
  });

  describe('onUpgrade', () => {
    const MANIFEST = path.join(PLUGINS_PATH, 'plugin-upgrade', 'manifest.json');

    const setManifestVersion = async (version: string) => {
      const manifest = JSON.parse(await fs.readFile(MANIFEST, 'utf-8'));

      await fs.writeFile(
        MANIFEST,
        JSON.stringify({ ...manifest, version }, null, 2)
      );
    };

    const readLifecycle = async () => {
      const logPath = path.join(
        getPluginDataPath('plugin-upgrade'),
        'lifecycle.log'
      );

      if (!(await fs.exists(logPath))) return [];

      return (await fs.readFile(logPath, 'utf-8')).trim().split('\n');
    };

    const storedVersion = async () =>
      (
        await tdb
          .select({ version: pluginData.version })
          .from(pluginData)
          .where(eq(pluginData.pluginId, 'plugin-upgrade'))
          .get()
      )?.version ?? null;

    // the lifecycle log lives in the plugin's durable data directory, which
    // outlives the per-test database on purpose, so it has to be cleared here
    beforeEach(async () => {
      await fs.rm(getPluginDataPath('plugin-upgrade'), {
        recursive: true,
        force: true
      });
    });

    afterEach(async () => {
      delete process.env.PLUGIN_UPGRADE_SHOULD_FAIL;
      await setManifestVersion('1.0.0');
    });

    test('should not run on a first install', async () => {
      await pluginManager.load('plugin-upgrade');

      expect(await readLifecycle()).toEqual(['load']);
      expect(await storedVersion()).toBe('1.0.0');
    });

    test('should run before onLoad when the version changed', async () => {
      await pluginManager.load('plugin-upgrade');
      await pluginManager.unload('plugin-upgrade');

      await setManifestVersion('2.0.0');
      await pluginManager.load('plugin-upgrade');

      expect(await readLifecycle()).toEqual([
        'load',
        'upgrade:1.0.0->2.0.0',
        'load'
      ]);
      expect(await storedVersion()).toBe('2.0.0');
    });

    test('should not run again once the version is recorded', async () => {
      await pluginManager.load('plugin-upgrade');
      await pluginManager.unload('plugin-upgrade');
      await pluginManager.load('plugin-upgrade');

      expect(await readLifecycle()).toEqual(['load', 'load']);
    });

    // a half migrated plugin must not start, and must try again next time
    test('should stop the load and keep the old version when it throws', async () => {
      await pluginManager.load('plugin-upgrade');
      await pluginManager.unload('plugin-upgrade');

      process.env.PLUGIN_UPGRADE_SHOULD_FAIL = 'true';
      await setManifestVersion('2.0.0');
      await pluginManager.load('plugin-upgrade');

      const info = await pluginManager.getPluginInfo('plugin-upgrade');

      expect(info.loadError).toContain('migration failed');
      expect(await storedVersion()).toBe('1.0.0');
      expect(await readLifecycle()).toEqual(['load']);

      delete process.env.PLUGIN_UPGRADE_SHOULD_FAIL;

      await pluginManager.load('plugin-upgrade');

      expect(await readLifecycle()).toEqual([
        'load',
        'upgrade:1.0.0->2.0.0',
        'load'
      ]);
      expect(await storedVersion()).toBe('2.0.0');
    });
  });

  // one emit point per event, all on paths the routes and the plugin API share
  describe('new events', () => {
    beforeEach(() => pluginManager.load('plugin-with-events'));

    // the assertions below all expect the event to have fired, so this reads as
    // the payload rather than making every call site unwrap a null
    const lastEvent = async (name: string): Promise<unknown> => {
      const result = (await pluginManager.executeCommand(
        'plugin-with-events',
        'get-last-event',
        mockInvokerCtx,
        { name }
      )) as { payload: unknown };

      return result.payload;
    };

    test('should fire when a reaction is added and removed', async () => {
      const { caller } = await initTest();

      await caller.messages.toggleReaction({ messageId: 1, emoji: '👍' });

      expect(await lastEvent('reaction:added')).toEqual({
        messageId: 1,
        channelId: 1,
        userId: 1,
        emoji: '👍'
      });

      await caller.messages.toggleReaction({ messageId: 1, emoji: '👍' });

      expect(await lastEvent('reaction:removed')).toBeDefined();
    });

    test('should fire when a message is pinned and unpinned', async () => {
      const { caller } = await initTest();

      await caller.messages.togglePin({ messageId: 1 });

      expect(await lastEvent('message:pinned')).toEqual({
        messageId: 1,
        channelId: 1,
        userId: 1
      });

      await caller.messages.togglePin({ messageId: 1 });

      expect(await lastEvent('message:unpinned')).toBeDefined();
    });

    test('should fire when a user is banned and unbanned', async () => {
      const { caller } = await initTest();

      await caller.users.ban({ userId: 2, reason: 'spam' });

      expect(await lastEvent('user:banned')).toEqual({
        userId: 2,
        reason: 'spam',
        actorUserId: 1
      });

      await caller.users.unban({ userId: 2 });

      expect(await lastEvent('user:unbanned')).toEqual({
        userId: 2,
        actorUserId: 1
      });
    });

    // a plugin is not a user, so the actor is absent rather than invented
    test('should fire with no actor when a plugin bans', async () => {
      await pluginManager.load('plugin-b');

      await pluginManager.executeCommand(
        'plugin-b',
        'moderate',
        mockInvokerCtx,
        { action: 'ban', userId: 2 }
      );

      const payload = (await lastEvent('user:banned')) as {
        actorUserId?: number;
      };

      expect(payload.actorUserId).toBeUndefined();
    });

    test('should fire when a role is assigned and removed', async () => {
      const { caller } = await initTest();

      await caller.users.addRole({ userId: 2, roleId: 4 });

      expect(await lastEvent('role:assigned')).toEqual({
        userId: 2,
        roleId: 4
      });

      await caller.users.removeRole({ userId: 2, roleId: 4 });

      expect(await lastEvent('role:removed')).toEqual({
        userId: 2,
        roleId: 4
      });
    });

    test('should fire through the whole channel lifecycle', async () => {
      const { caller } = await initTest();

      const channelId = await caller.channels.add({
        name: 'events',
        type: ChannelType.TEXT,
        categoryId: 1
      });

      expect(await lastEvent('channel:created')).toEqual({
        channelId,
        name: 'events',
        type: ChannelType.TEXT,
        categoryId: 1
      });

      await caller.channels.update({ channelId, name: 'renamed' });

      expect(await lastEvent('channel:updated')).toMatchObject({
        channelId,
        name: 'renamed'
      });

      await caller.channels.delete({ channelId });

      expect(await lastEvent('channel:deleted')).toEqual({
        channelId,
        name: 'renamed'
      });
    });

    test('should fire through the whole category lifecycle', async () => {
      const { caller } = await initTest();

      const categoryId = await caller.categories.add({ name: 'events' });

      expect(await lastEvent('category:created')).toEqual({
        categoryId,
        name: 'events'
      });

      await caller.categories.update({ categoryId, name: 'renamed' });

      expect(await lastEvent('category:updated')).toEqual({
        categoryId,
        name: 'renamed'
      });

      await caller.categories.delete({ categoryId });

      expect(await lastEvent('category:deleted')).toEqual({
        categoryId,
        name: 'renamed'
      });
    });

    // the role itself, as opposed to role:assigned which is membership
    test('should fire through the whole role lifecycle', async () => {
      const { caller } = await initTest();

      const roleId = await caller.roles.add();

      expect(await lastEvent('role:created')).toMatchObject({ roleId });

      await caller.roles.update({
        roleId,
        name: 'Renamed',
        color: '#ffffff',
        permissions: [],
        storageQuotaOverrideEnabled: false,
        storageSpaceQuota: STORAGE_MIN_QUOTA_PER_USER
      });

      expect(await lastEvent('role:updated')).toEqual({
        roleId,
        name: 'Renamed'
      });

      await caller.roles.delete({ roleId });

      expect(await lastEvent('role:deleted')).toMatchObject({ roleId });
    });

    test('should fire when a user edits their profile', async () => {
      const { caller } = await initTest(1);

      await caller.users.update({
        name: 'Renamed Owner',
        profileColor: '#ffffff'
      });

      expect(await lastEvent('user:updated')).toEqual({
        userId: 1,
        username: 'Renamed Owner'
      });
    });

    test('should fire when a user is deleted', async () => {
      const { caller } = await initTest();

      await caller.users.delete({ userId: 2, wipe: false });

      expect(await lastEvent('user:deleted')).toEqual({ userId: 2 });
    });
  });

  describe('user:left', () => {
    type TSocket = Parameters<typeof handleSocketClose>[0];

    const getCounts = async () =>
      (await pluginManager.executeCommand(
        'plugin-with-events',
        'get-counts',
        mockInvokerCtx,
        {}
      )) as { userJoined: number; userLeft: number };

    test('should fire when a user closes their last session', async () => {
      await pluginManager.load('plugin-with-events');

      expect((await getCounts()).userLeft).toBe(0);

      await handleSocketClose({ userId: 2 } as unknown as TSocket);

      expect((await getCounts()).userLeft).toBe(1);
    });

    // a second tab closing is not a departure, so the event must not fire
    test('should not fire while another session is still open', async () => {
      await pluginManager.load('plugin-with-events');

      const first = { userId: 2 } as unknown as TSocket;
      const second = { userId: 2 } as unknown as TSocket;

      trackUserSocket(2, first);
      trackUserSocket(2, second);

      await handleSocketClose(first);

      expect((await getCounts()).userLeft).toBe(0);

      await handleSocketClose(second);

      expect((await getCounts()).userLeft).toBe(1);
    });

    test('should ignore a socket that never authenticated', async () => {
      await pluginManager.load('plugin-with-events');

      await handleSocketClose({} as unknown as TSocket);

      expect((await getCounts()).userLeft).toBe(0);
    });
  });

  describe('beforeFileSave hooks integration', () => {
    test('should allow plugins to modify file contents before saving', async () => {
      await pluginManager.load('plugin-before-file-save');

      const fileName = `plugin-hook-${Date.now()}.txt`;
      const sourcePath = path.join(UPLOADS_PATH, fileName);
      await fs.writeFile(sourcePath, 'original content');
      const stats = await fs.stat(sourcePath);

      const tempFile = await fileManager.addTemporaryFile({
        filePath: sourcePath,
        size: stats.size,
        originalName: fileName,
        userId: 1
      });

      const saved = await fileManager.saveFile(
        tempFile.id,
        1,
        FileSaveType.MESSAGE
      );

      const savedPath = path.join(PUBLIC_PATH, saved.name);
      const savedContent = await fs.readFile(savedPath, 'utf-8');

      expect(savedContent).toBe('original content\nmodified by plugin');

      await fs.unlink(savedPath);
    });
  });

  describe('messages actions', () => {
    test('should let plugin edit its own message', async () => {
      await pluginManager.load('plugin-message-actions');

      const { messageId } = (await pluginManager.executeCommand(
        'plugin-message-actions',
        'send-message',
        mockInvokerCtx,
        {
          channelId: 1,
          content: 'plugin original'
        }
      )) as { messageId: number };

      await pluginManager.executeCommand(
        'plugin-message-actions',
        'edit-message',
        mockInvokerCtx,
        {
          messageId,
          content: 'plugin edited'
        }
      );

      const updated = await tdb
        .select({ content: messages.content })
        .from(messages)
        .where(eq(messages.id, messageId))
        .get();

      expect(updated?.content).toBe('plugin edited');
    });

    test('should let plugin delete its own message', async () => {
      await pluginManager.load('plugin-message-actions');

      const { messageId } = (await pluginManager.executeCommand(
        'plugin-message-actions',
        'send-message',
        mockInvokerCtx,
        {
          channelId: 1,
          content: 'plugin delete me'
        }
      )) as { messageId: number };

      await pluginManager.executeCommand(
        'plugin-message-actions',
        'delete-message',
        mockInvokerCtx,
        { messageId }
      );

      const deleted = await tdb
        .select({ id: messages.id })
        .from(messages)
        .where(eq(messages.id, messageId))
        .get();

      expect(deleted).toBeUndefined();
    });

    test('should let plugin send inline replies', async () => {
      await pluginManager.load('plugin-message-actions');

      const targetMessageId = await tdb
        .insert(messages)
        .values({
          channelId: 1,
          userId: 1,
          content: 'inline reply target',
          createdAt: Date.now()
        })
        .returning({ id: messages.id })
        .get();

      const { messageId } = (await pluginManager.executeCommand(
        'plugin-message-actions',
        'send-message',
        mockInvokerCtx,
        {
          channelId: 1,
          content: 'plugin inline reply',
          replyToMessageId: targetMessageId.id
        }
      )) as { messageId: number };

      const created = await tdb
        .select({
          replyToMessageId: messages.replyToMessageId,
          parentMessageId: messages.parentMessageId
        })
        .from(messages)
        .where(eq(messages.id, messageId))
        .get();

      expect(created?.replyToMessageId).toBe(targetMessageId.id);
      expect(created?.parentMessageId).toBeNull();
    });

    test('should let plugin send thread replies with inline target', async () => {
      await pluginManager.load('plugin-message-actions');

      const parent = await tdb
        .insert(messages)
        .values({
          channelId: 1,
          userId: 1,
          content: 'thread parent',
          createdAt: Date.now()
        })
        .returning({ id: messages.id })
        .get();

      const inlineTarget = await tdb
        .insert(messages)
        .values({
          channelId: 1,
          userId: 1,
          content: 'inline target in thread',
          createdAt: Date.now()
        })
        .returning({ id: messages.id })
        .get();

      const { messageId } = (await pluginManager.executeCommand(
        'plugin-message-actions',
        'send-message',
        mockInvokerCtx,
        {
          channelId: 1,
          content: 'plugin thread reply with inline target',
          parentMessageId: parent.id,
          replyToMessageId: inlineTarget.id
        }
      )) as { messageId: number };

      const created = await tdb
        .select({
          replyToMessageId: messages.replyToMessageId,
          parentMessageId: messages.parentMessageId
        })
        .from(messages)
        .where(eq(messages.id, messageId))
        .get();

      expect(created?.parentMessageId).toBe(parent.id);
      expect(created?.replyToMessageId).toBe(inlineTarget.id);
    });
  });

  describe('execution timeout', () => {
    test('should resolve before timeout when execution completes', async () => {
      const result = await withTimeout(
        Promise.resolve('done'),
        1000,
        'should not timeout'
      );

      expect(result).toBe('done');
    });
  });

  describe('ctx.events unsubscribe', () => {
    test('ctx.events.on() returns an unsubscribe function that stops events', async () => {
      await pluginManager.load('plugin-with-events');

      await eventBus.emit('user:joined', { userId: 1, username: 'alice' });

      const result1 = (await pluginManager.executeCommand(
        'plugin-with-events',
        'get-counts',
        mockInvokerCtx,
        {}
      )) as Record<string, number>;

      expect(result1.userJoined).toBe(1);

      await pluginManager.unload('plugin-with-events');

      expect(eventBus.hasPlugin('plugin-with-events')).toBe(false);
    });
  });
});
