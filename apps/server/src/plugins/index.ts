import type { PluginContext, UnloadPluginContext } from '@sharkord/plugin-sdk';
import {
  ServerEvents,
  zPluginPackageJson,
  type CommandDefinition,
  type TCommandsMapByPlugin,
  type TLogEntry,
  type TPluginInfo
} from '@sharkord/shared';
import chalk from 'chalk';
import fs from 'node:fs/promises';
import path from 'path';
import { getSettings } from '../db/queries/server';
import { PLUGINS_PATH } from '../helpers/paths';
import { logger } from '../logger';
import { VoiceRuntime } from '../runtimes/voice';
import { pubsub } from '../utils/pubsub';
import { eventBus } from './event-bus';

type PluginModule = {
  onLoad: (ctx: PluginContext) => void | Promise<void>;
  onUnload?: (ctx: UnloadPluginContext) => void | Promise<void>;
};

type RegisteredCommand = {
  pluginId: string;
  name: string;
  description?: string;
  args?: CommandDefinition<unknown>['args'];
  command: CommandDefinition<unknown>;
};

class PluginManager {
  private loadedPlugins = new Map<string, PluginModule>();
  private loadErrors = new Map<string, string>();
  private logs = new Map<string, TLogEntry[]>();
  private logsListeners = new Map<string, (newLog: TLogEntry) => void>();
  private commands = new Map<string, RegisteredCommand[]>();

  public loadPlugins = async () => {
    const settings = await getSettings();

    if (!settings.enablePlugins) return;

    const files = await fs.readdir(PLUGINS_PATH);

    logger.debug(`Found ${files.length} plugins`);

    for (const file of files) {
      try {
        await pluginManager.load(file);
      } catch (error) {
        logger.error(
          `Failed to load plugin ${file}: ${(error as Error).message}`
        );
      }
    }
  };

  public unloadPlugins = async () => {
    for (const pluginId of this.loadedPlugins.keys()) {
      try {
        await this.unload(pluginId);
      } catch (error) {
        logger.error(
          `Failed to unload plugin ${pluginId}: ${(error as Error).message}`
        );
      }
    }
  };

  public onLog = (pluginId: string, listener: (newLog: TLogEntry) => void) => {
    if (!this.logsListeners.has(pluginId)) {
      this.logsListeners.set(pluginId, listener);
    }

    return () => {
      this.logsListeners.delete(pluginId);
    };
  };

  public getLogs = (pluginId: string): TLogEntry[] => {
    return this.logs.get(pluginId) || [];
  };

  private logPlugin = (
    pluginId: string,
    type: 'info' | 'error' | 'debug',
    ...message: unknown[]
  ) => {
    if (!this.logs.has(pluginId)) {
      this.logs.set(pluginId, []);
    }

    const loggerFn = logger[type];
    const parsedMessage = message
      .map((m) => (typeof m === 'object' ? JSON.stringify(m) : String(m)))
      .join(' ');

    loggerFn(`${chalk.magentaBright(`[plugin:${pluginId}]`)} ${parsedMessage}`);

    const pluginLogs = this.logs.get(pluginId)!;

    const newLog: TLogEntry = {
      type,
      timestamp: Date.now(),
      message: parsedMessage,
      pluginId
    };

    pluginLogs.push(newLog);

    // keep only the last 1000 logs per plugin
    if (pluginLogs.length > 1000) {
      pluginLogs.shift();
    }

    const listener = this.logsListeners.get(pluginId);

    if (listener) {
      listener(newLog);
    }

    pubsub.publish(ServerEvents.PLUGIN_LOG, newLog);
  };

  private getPluginPath = (pluginId: string) =>
    path.join(PLUGINS_PATH, pluginId);

  private unregisterPluginCommands = (pluginId: string) => {
    const pluginCommands = this.commands.get(pluginId);

    if (!pluginCommands || pluginCommands.length === 0) {
      return;
    }

    const commandNames = pluginCommands.map((c) => c.name);

    this.commands.delete(pluginId);

    this.logPlugin(
      pluginId,
      'debug',
      `Unregistered ${commandNames.length} command(s): ${commandNames.join(', ')}`
    );
  };

  public executeCommand = async <TArgs = unknown>(
    pluginId: string,
    commandName: string,
    args: TArgs
  ): Promise<unknown> => {
    const commands = this.commands.get(pluginId);

    if (!commands) {
      throw new Error(`Plugin '${pluginId}' has no registered commands.`);
    }

    const foundCommand = commands.find((c) => c.name === commandName);

    if (!foundCommand) {
      throw new Error(
        `Command '${commandName}' not found for plugin '${pluginId}'.`
      );
    }

    try {
      this.logPlugin(
        pluginId,
        'debug',
        `Executing command '${commandName}' with args:`,
        args
      );

      return await foundCommand.command.executes(args);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logPlugin(
        pluginId,
        'error',
        `Error executing command '${commandName}': ${errorMessage}`
      );

      throw error;
    }
  };

  public getCommands = (): TCommandsMapByPlugin => {
    const allCommands: TCommandsMapByPlugin = {};

    for (const [pluginId, commands] of this.commands.entries()) {
      allCommands[pluginId] = commands.map(({ name, description, args }) => ({
        pluginId,
        name,
        description,
        args
      }));
    }

    return allCommands;
  };

  public hasCommand = (pluginId: string, commandName: string): boolean => {
    const commands = this.commands.get(pluginId);

    if (!commands) {
      return false;
    }

    return commands.some((c) => c.name === commandName);
  };

  public togglePlugin = async (pluginId: string, enabled: boolean) => {
    const pluginPath = this.getPluginPath(pluginId);
    const packageJsonPath = path.join(pluginPath, 'package.json');

    if (!(await fs.exists(packageJsonPath))) {
      throw new Error('package.json not found');
    }

    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);

    if (!packageJson.sharkord) {
      packageJson.sharkord = {};
    }

    packageJson.sharkord.enabled = enabled;

    await fs.writeFile(
      packageJsonPath,
      JSON.stringify(packageJson, null, 2),
      'utf-8'
    );

    // was disabled and is now being enabled
    if (!enabled && this.loadedPlugins.has(pluginId)) {
      await this.unload(pluginId);
    }

    // was enabled and is now being disabled
    if (enabled && !this.loadedPlugins.has(pluginId)) {
      await this.load(pluginId);
    }
  };

  public unload = async (pluginId: string) => {
    const pluginModule = this.loadedPlugins.get(pluginId);

    if (!pluginModule) {
      this.logPlugin(
        pluginId,
        'debug',
        `Plugin ${pluginId} is not loaded; nothing to unload.`
      );
      return;
    }

    if (typeof pluginModule.onUnload === 'function') {
      try {
        const unloadCtx = this.createUnloadContext(pluginId);

        await pluginModule.onUnload(unloadCtx);
      } catch (error) {
        logger.error(`Error in plugin ${pluginId} onUnload:`, error);
      }
    }

    eventBus.unload(pluginId);
    this.unregisterPluginCommands(pluginId);
    this.loadedPlugins.delete(pluginId);
    this.loadErrors.delete(pluginId);

    logger.info(`Plugin unloaded: ${pluginId}`);
  };

  public getPluginInfo = async (pluginId: string): Promise<TPluginInfo> => {
    const pluginPath = this.getPluginPath(pluginId);
    const packageJsonPath = path.join(pluginPath, 'package.json');

    if (!(await fs.exists(packageJsonPath))) {
      throw new Error('package.json not found');
    }

    const packageJson = zPluginPackageJson.parse(
      JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'))
    );

    const entryFilePath = path.join(pluginPath, packageJson.sharkord.entry);

    if (!(await fs.exists(entryFilePath))) {
      throw new Error('Plugin entry file not found');
    }

    // Get load error if it exists
    const loadError = this.loadErrors.get(pluginId);

    return {
      id: pluginId,
      enabled: packageJson.sharkord.enabled,
      name: packageJson.name,
      path: pluginPath,
      description: packageJson.sharkord.description,
      version: packageJson.version,
      logo: packageJson.sharkord.logo,
      author: packageJson.sharkord.author,
      homepage: packageJson.sharkord.homepage,
      entry: entryFilePath,
      loadError
    };
  };

  public load = async (pluginId: string) => {
    const { enablePlugins } = await getSettings();

    if (!enablePlugins) {
      throw new Error('Plugins are disabled.');
    }

    const info = await this.getPluginInfo(pluginId);

    if (!info.enabled) {
      this.logPlugin(
        pluginId,
        'debug',
        `Plugin ${pluginId} is disabled; skipping load.`
      );
      return;
    }

    try {
      const ctx = this.createContext(pluginId);
      const mod = await import(info.entry);

      if (typeof mod.onLoad !== 'function') {
        throw new Error(
          `Plugin ${pluginId} does not export an 'onLoad' function`
        );
      }

      await mod.onLoad(ctx);

      this.loadedPlugins.set(pluginId, mod as PluginModule);
      this.loadErrors.delete(pluginId);

      this.logPlugin(
        pluginId,
        'info',
        `Plugin loaded: ${pluginId}@v${info.version} by ${info.author}`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.loadErrors.set(pluginId, errorMessage);

      this.logPlugin(
        pluginId,
        'error',
        `Failed to load plugin ${pluginId}: ${errorMessage}`
      );

      await this.unload(pluginId);
    }
  };

  private createContext = (pluginId: string): PluginContext => {
    return {
      path: this.getPluginPath(pluginId),
      log: (...message: unknown[]) => {
        this.logPlugin(pluginId, 'info', ...message);
      },
      debug: (...message: unknown[]) => {
        this.logPlugin(pluginId, 'debug', ...message);
      },
      error: (...message: unknown[]) => {
        this.logPlugin(pluginId, 'error', ...message);
      },
      events: {
        on: (event, handler) => {
          eventBus.register(pluginId, event, handler);
        }
      },
      actions: {
        voice: {
          getRouter: (channelId: number) => {
            const channel = VoiceRuntime.findById(channelId);

            if (!channel) {
              throw new Error(
                `Voice runtime not found for channel ID ${channelId}`
              );
            }

            return channel.getRouter();
          },
          addExternalProducer: (channelId, type, producer) => {
            const channel = VoiceRuntime.findById(channelId);

            if (!channel) {
              throw new Error(
                `Voice runtime not found for channel ID ${channelId}`
              );
            }

            const externalId = channel.addExternalProducer(type, producer);

            // Publish event to notify connected clients about the new external producer
            pubsub.publish(ServerEvents.VOICE_NEW_PRODUCER, {
              channelId,
              remoteId: externalId,
              kind: type
            });

            return externalId;
          }
        }
      },
      commands: {
        register: <TArgs = void>(command: CommandDefinition<TArgs>) => {
          if (!this.commands.has(pluginId)) {
            this.commands.set(pluginId, []);
          }

          const pluginCommands = this.commands.get(pluginId)!;

          // Check if command already exists
          const existingIndex = pluginCommands.findIndex(
            (c) => c.name === command.name
          );

          if (existingIndex !== -1) {
            this.logPlugin(
              pluginId,
              'error',
              `Command '${command.name}' is already registered. Overwriting.`
            );
            pluginCommands.splice(existingIndex, 1);
          }

          pluginCommands.push({
            pluginId,
            name: command.name,
            description: command.description,
            args: command.args,
            command: command as CommandDefinition<unknown>
          });

          this.logPlugin(
            pluginId,
            'debug',
            `Registered command: ${command.name}${command.description ? ` - ${command.description}` : ''}`
          );
        }
      }
    };
  };

  private createUnloadContext = (pluginId: string): UnloadPluginContext => {
    const baseCtx = this.createContext(pluginId);

    return {
      log: baseCtx.log,
      debug: baseCtx.debug,
      error: baseCtx.error
    };
  };
}

const pluginManager = new PluginManager();

export { pluginManager };
