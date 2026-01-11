import { beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import fs from 'fs/promises';
import path from 'path';
import { pluginManager } from '..';
import { tdb } from '../../__tests__/setup';
import { settings } from '../../db/schema';
import { PLUGINS_PATH } from '../../helpers/paths';

describe('plugin-manager', () => {
  beforeAll(async () => {
    const mocksPath = path.join(__dirname, 'mocks');
    const plugins = await fs.readdir(mocksPath);

    for (const plugin of plugins) {
      const src = path.join(mocksPath, plugin);
      const dest = path.join(PLUGINS_PATH, plugin);

      await fs.cp(src, dest, { recursive: true });
    }

    await fs.writeFile(
      path.join(PLUGINS_PATH, 'plugin-states.json'),
      JSON.stringify({
        'plugin-a': true,
        'plugin-b': true,
        'plugin-with-events': true
      })
    );
  });

  beforeEach(async () => {
    // enable plugins in settings
    await tdb.update(settings).set({ enablePlugins: true });

    // unload all plugins before each test
    await pluginManager.unloadPlugins();

    // reset plugin states - enable test plugins
    await fs.writeFile(
      path.join(PLUGINS_PATH, 'plugin-states.json'),
      JSON.stringify({
        'plugin-a': true,
        'plugin-b': true,
        'plugin-with-events': true,
        'plugin-no-unload': true,
        'plugin-no-onload': true,
        'plugin-throws-error': true
      })
    );

    // reload plugin states into memory
    await pluginManager.loadPlugins();
    await pluginManager.unloadPlugins();
  });

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
      expect(commands['plugin-b']!.length).toBe(2);
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

    test('should handle plugin with invalid package.json', async () => {
      await expect(
        pluginManager.getPluginInfo('plugin-invalid-package')
      ).rejects.toThrow();
    });

    test('should handle plugin with missing entry file', async () => {
      await expect(
        pluginManager.getPluginInfo('plugin-missing-entry')
      ).rejects.toThrow('Plugin entry file not found');
    });

    test('should load plugin without onUnload', async () => {
      await pluginManager.togglePlugin('plugin-no-unload', true);
      await pluginManager.load('plugin-no-unload');

      const info = await pluginManager.getPluginInfo('plugin-no-unload');

      expect(info.loadError).toBeUndefined();
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

      const result = await pluginManager.executeCommand('plugin-b', 'sum', {
        a: 5,
        b: 3
      });

      expect(result).toEqual({ result: 8 });
    });

    test('should execute command with string argument', async () => {
      await pluginManager.load('plugin-b');

      const result = await pluginManager.executeCommand(
        'plugin-b',
        'test-command',
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
        pluginManager.executeCommand('plugin-b', 'sum', { a: 1, b: 2 })
      ).rejects.toThrow('is not enabled');
    });

    test('should throw error when plugin has no commands', async () => {
      await pluginManager.load('plugin-a');

      await expect(
        pluginManager.executeCommand('plugin-a', 'nonexistent', {})
      ).rejects.toThrow('has no registered commands');
    });

    test('should throw error when command does not exist', async () => {
      await pluginManager.load('plugin-b');

      await expect(
        pluginManager.executeCommand('plugin-b', 'nonexistent', {})
      ).rejects.toThrow('not found');
    });

    test('should get all commands from all plugins', async () => {
      await pluginManager.load('plugin-b');
      await pluginManager.load('plugin-with-events');

      const commands = pluginManager.getCommands();

      expect(commands['plugin-b']).toBeDefined();
      expect(commands['plugin-b']!.length).toBe(2);
      expect(commands['plugin-with-events']).toBeDefined();
      expect(commands['plugin-with-events']!.length).toBe(1);
    });

    test('should check if plugin has specific command', async () => {
      await pluginManager.load('plugin-b');

      expect(pluginManager.hasCommand('plugin-b', 'sum')).toBe(true);
      expect(pluginManager.hasCommand('plugin-b', 'nonexistent')).toBe(false);
      expect(pluginManager.hasCommand('nonexistent-plugin', 'sum')).toBe(false);
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

    test('should persist enabled state to file', async () => {
      await pluginManager.togglePlugin('plugin-a', true);

      const statesFile = path.join(PLUGINS_PATH, 'plugin-states.json');
      const content = await fs.readFile(statesFile, 'utf-8');
      const states = JSON.parse(content);

      expect(states['plugin-a']).toBe(true);
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
      ).rejects.toThrow('package.json not found');
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
      expect(plugins).not.toContain('plugin-states.json');

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

    test('should support log listener', async () => {
      let capturedLog = null;

      const unsubscribe = pluginManager.onLog('plugin-a', (log) => {
        capturedLog = log;
      });

      await pluginManager.load('plugin-a');

      expect(capturedLog).not.toBeNull();
      expect(capturedLog!.pluginId).toBe('plugin-a');

      unsubscribe();
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
});
