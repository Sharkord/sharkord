import type {
  PluginContext,
  PluginSettings,
  TCreateStreamOptions,
  TExternalStreamHandle,
  UnloadPluginContext
} from '@sharkord/plugin-sdk';
import {
  ServerEvents,
  StreamKind,
  zPluginPackageJson,
  type CommandDefinition,
  type RegisteredCommand,
  type TCommandsMapByPlugin,
  type TInvokerContext,
  type TLogEntry,
  type TPluginInfo,
  type TPluginSettingDefinition,
  type TPluginSettingsResponse
} from '@sharkord/shared';
import chalk from 'chalk';
import { eq } from 'drizzle-orm';
import fs from 'node:fs/promises';
import path from 'path';
import { db } from '../db';
import { getSettings } from '../db/queries/server';
import { pluginData } from '../db/schema';
import { PLUGINS_PATH } from '../helpers/paths';
import { logger } from '../logger';
import { VoiceRuntime } from '../runtimes/voice';
import { pubsub } from '../utils/pubsub';
import { eventBus } from './event-bus';

type PluginModule = {
  onLoad: (ctx: PluginContext) => void | Promise<void>;
  onUnload?: (ctx: UnloadPluginContext) => void | Promise<void>;
};

type PluginStatesMap = Record<string, boolean>;

class PluginManager {
  private loadedPlugins = new Map<string, PluginModule>();
  private loadErrors = new Map<string, string>();
  private logs = new Map<string, TLogEntry[]>();
  private logsListeners = new Map<string, Set<(newLog: TLogEntry) => void>>();
  private commands = new Map<string, RegisteredCommand[]>();
  private pluginStates: PluginStatesMap = {};
  private settingDefinitions = new Map<string, TPluginSettingDefinition[]>();
  private settingValues = new Map<string, Record<string, unknown>>();

  private loadPluginStates = async () => {
    try {
      await this.migratePluginStatesFile();

      const rows = await db
        .select({
          pluginId: pluginData.pluginId,
          enabled: pluginData.enabled
        })
        .from(pluginData);

      this.pluginStates = rows.reduce<PluginStatesMap>((acc, row) => {
        acc[row.pluginId] = row.enabled;
        return acc;
      }, {});
    } catch (error) {
      logger.error('Failed to load plugin states:', error);
      this.pluginStates = {};
    }
  };

  private migratePluginStatesFile = async () => {
    const statesFile = path.join(PLUGINS_PATH, 'plugin-states.json');

    try {
      if (!(await fs.exists(statesFile))) return;

      const content = await fs.readFile(statesFile, 'utf-8');
      const states = JSON.parse(content) as PluginStatesMap;

      const entries = Object.entries(states).map(([pluginId, enabled]) => ({
        pluginId,
        enabled
      }));

      if (entries.length > 0) {
        for (const entry of entries) {
          await db
            .insert(pluginData)
            .values(entry)
            .onConflictDoUpdate({
              target: pluginData.pluginId,
              set: { enabled: entry.enabled }
            });
        }
      }

      await fs.unlink(statesFile);
    } catch (error) {
      logger.error('Failed to migrate plugin states file:', error);
    }
  };

  private getPluginEnabledFromDb = async (pluginId: string) => {
    const rows = await db
      .select({ enabled: pluginData.enabled })
      .from(pluginData)
      .where(eq(pluginData.pluginId, pluginId));

    return rows[0]?.enabled ?? false;
  };

  private ensurePluginState = async (pluginId: string) => {
    if (this.pluginStates[pluginId] !== undefined) return;

    const enabled = await this.getPluginEnabledFromDb(pluginId);
    this.pluginStates[pluginId] = enabled;
  };

  private isPluginEnabled = (pluginId: string): boolean => {
    return this.pluginStates[pluginId] ?? false;
  };

  private setPluginEnabled = async (pluginId: string, enabled: boolean) => {
    this.pluginStates[pluginId] = enabled;

    await db
      .insert(pluginData)
      .values({ pluginId, enabled })
      .onConflictDoUpdate({
        target: pluginData.pluginId,
        set: { enabled }
      });
  };

  public getCommandByName = (
    commandName: string | undefined
  ): RegisteredCommand | undefined => {
    if (!commandName) {
      return undefined;
    }

    for (const commands of this.commands.values()) {
      const foundCommand = commands.find((c) => c.name === commandName);

      if (foundCommand) {
        return foundCommand;
      }
    }

    return undefined;
  };

  public getPluginsFromPath = async (): Promise<string[]> => {
    const files = await fs.readdir(PLUGINS_PATH);
    const result: string[] = [];

    logger.debug(`Found ${files.length} plugins`);

    for (const file of files) {
      try {
        // check if it's a directory
        const pluginPath = path.join(PLUGINS_PATH, file);
        const stat = await fs.stat(pluginPath);

        if (!stat.isDirectory()) continue;

        result.push(file);
      } catch {
        // ignore
      }
    }

    return result;
  };

  public loadPlugins = async () => {
    const settings = await getSettings();

    if (!settings.enablePlugins) return;

    await this.loadPluginStates();

    const files = await this.getPluginsFromPath();

    logger.info(`Loading ${files.length} plugins...`);

    for (const file of files) {
      try {
        await this.load(file);
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
      this.logsListeners.set(pluginId, new Set());
    }

    this.logsListeners.get(pluginId)!.add(listener);

    return () => {
      const listeners = this.logsListeners.get(pluginId);

      if (listeners) {
        listeners.delete(listener);

        if (listeners.size === 0) {
          this.logsListeners.delete(pluginId);
        }
      }
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

    const listeners = this.logsListeners.get(pluginId);

    if (listeners) {
      for (const listener of listeners) {
        listener(newLog);
      }
    }

    pubsub.publish(ServerEvents.PLUGIN_LOG, newLog);
  };

  private validatePluginId = (pluginId: string) => {
    // prevent path traversal attacks (e.g. "../../etc/passwd")
    if (
      pluginId.includes('..') ||
      pluginId.includes('/') ||
      pluginId.includes('\\') ||
      pluginId.includes('\0')
    ) {
      throw new Error(`Invalid plugin ID: '${pluginId}'`);
    }
  };

  private getPluginPath = (pluginId: string) => {
    this.validatePluginId(pluginId);
    return path.join(PLUGINS_PATH, pluginId);
  };

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
    invokerCtx: TInvokerContext,
    args: TArgs
  ): Promise<unknown> => {
    const isEnabled = this.isPluginEnabled(pluginId);

    if (!isEnabled) {
      throw new Error(`Plugin '${pluginId}' is not enabled.`);
    }

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

      return await foundCommand.command.executes(invokerCtx, args);
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
    await this.ensurePluginState(pluginId);
    const wasEnabled = this.isPluginEnabled(pluginId);

    await this.setPluginEnabled(pluginId, enabled);

    // was enabled and is now being disabled
    if (wasEnabled && !enabled && this.loadedPlugins.has(pluginId)) {
      await this.unload(pluginId);
    }

    // was disabled and is now being enabled
    if (!wasEnabled && enabled && !this.loadedPlugins.has(pluginId)) {
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
    this.settingDefinitions.delete(pluginId);
    this.settingValues.delete(pluginId);
    this.loadedPlugins.delete(pluginId);
    this.loadErrors.delete(pluginId);

    logger.info(`Plugin unloaded: ${pluginId}`);
  };

  public getPluginInfo = async (pluginId: string): Promise<TPluginInfo> => {
    await this.ensurePluginState(pluginId);
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

    const loadError = this.loadErrors.get(pluginId);

    return {
      id: pluginId,
      enabled: this.isPluginEnabled(pluginId),
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

    if (!this.isPluginEnabled(pluginId)) {
      this.logPlugin(
        pluginId,
        'debug',
        `Plugin ${pluginId} is disabled; skipping load.`
      );
      return;
    }

    const info = await this.getPluginInfo(pluginId);

    try {
      const ctx = this.createContext(pluginId);
      const mod = await import(info.entry);

      if (typeof mod.onLoad !== 'function') {
        throw new Error(
          `Plugin ${pluginId} does not export an 'onLoad' function`
        );
      }

      await mod.onLoad(ctx);

      this.loadedPlugins.set(pluginId, mod);
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

  private loadSettingsFromDb = async (
    pluginId: string
  ): Promise<Record<string, unknown>> => {
    const rows = await db
      .select()
      .from(pluginData)
      .where(eq(pluginData.pluginId, pluginId));

    if (rows.length > 0 && rows[0]!.settings) {
      return rows[0]!.settings;
    }

    return {};
  };

  private saveSettingsToDb = async (
    pluginId: string,
    values: Record<string, unknown>
  ) => {
    const enabled = this.pluginStates[pluginId] ?? true;

    await db
      .insert(pluginData)
      .values({ pluginId, enabled, settings: values })
      .onConflictDoUpdate({
        target: pluginData.pluginId,
        set: { settings: values }
      });
  };

  private registerSettings = async (
    pluginId: string,
    definitions: readonly TPluginSettingDefinition[]
  ): Promise<PluginSettings> => {
    this.settingDefinitions.set(pluginId, [...definitions]);

    // load existing values from DB, merge with defaults
    const dbValues = await this.loadSettingsFromDb(pluginId);
    const merged: Record<string, unknown> = {};

    for (const def of definitions) {
      merged[def.key] =
        dbValues[def.key] !== undefined ? dbValues[def.key] : def.defaultValue;
    }

    this.settingValues.set(pluginId, merged);

    // persist merged values back (in case new defaults were added)
    await this.saveSettingsToDb(pluginId, merged);

    this.logPlugin(
      pluginId,
      'debug',
      `Registered ${definitions.length} setting(s): ${definitions.map((d) => d.key).join(', ')}`
    );

    return {
      get: (key: string) => {
        const values = this.settingValues.get(pluginId);
        if (!values) return undefined;
        return values[key];
      },
      set: (key: string, value: unknown) => {
        const values = this.settingValues.get(pluginId);
        if (!values) return;

        const def = this.settingDefinitions
          .get(pluginId)
          ?.find((d) => d.key === key);
        if (!def) {
          this.logPlugin(
            pluginId,
            'error',
            `Setting key '${key}' is not registered.`
          );
          return;
        }

        values[key] = value;

        // persist async without blocking
        this.saveSettingsToDb(pluginId, values).catch((err) => {
          this.logPlugin(
            pluginId,
            'error',
            `Failed to persist setting '${key}':`,
            err
          );
        });
      }
    };
  };

  public getPluginSettings = async (
    pluginId: string
  ): Promise<TPluginSettingsResponse> => {
    const definitions = this.settingDefinitions.get(pluginId) || [];
    let values = this.settingValues.get(pluginId);

    if (!values) {
      // plugin might not be loaded, try reading from DB
      const dbValues = await this.loadSettingsFromDb(pluginId);
      values = {};

      for (const def of definitions) {
        values[def.key] =
          dbValues[def.key] !== undefined
            ? dbValues[def.key]
            : def.defaultValue;
      }
    }

    return { definitions, values };
  };

  public updatePluginSetting = async (
    pluginId: string,
    key: string,
    value: unknown
  ) => {
    const definitions = this.settingDefinitions.get(pluginId);

    if (!definitions) {
      throw new Error(`Plugin '${pluginId}' has no registered settings.`);
    }

    const def = definitions.find((d) => d.key === key);

    if (!def) {
      throw new Error(
        `Setting '${key}' is not registered for plugin '${pluginId}'.`
      );
    }

    const values = this.settingValues.get(pluginId) || {};
    values[key] = value;
    this.settingValues.set(pluginId, values);

    await this.saveSettingsToDb(pluginId, values);

    this.logPlugin(pluginId, 'debug', `Setting '${key}' updated to:`, value);
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
          createStream: (
            options: TCreateStreamOptions
          ): TExternalStreamHandle => {
            const channel = VoiceRuntime.findById(options.channelId);

            if (!channel) {
              throw new Error(
                `Voice runtime not found for channel ID ${options.channelId}`
              );
            }

            const streamId = channel.createExternalStream({
              title: options.title,
              key: options.key,
              pluginId,
              avatarUrl: options.avatarUrl,
              producers: options.producers
            });

            const stream = channel.getState().externalStreams[streamId]!;

            pubsub.publish(ServerEvents.VOICE_ADD_EXTERNAL_STREAM, {
              channelId: options.channelId,
              streamId,
              stream
            });

            if (options.producers.audio) {
              pubsub.publishForChannel(
                options.channelId,
                ServerEvents.VOICE_NEW_PRODUCER,
                {
                  channelId: options.channelId,
                  remoteId: streamId,
                  kind: StreamKind.EXTERNAL_AUDIO
                }
              );
            }

            if (options.producers.video) {
              pubsub.publishForChannel(
                options.channelId,
                ServerEvents.VOICE_NEW_PRODUCER,
                {
                  channelId: options.channelId,
                  remoteId: streamId,
                  kind: StreamKind.EXTERNAL_VIDEO
                }
              );
            }

            this.logPlugin(
              pluginId,
              'debug',
              `Created external stream '${options.title}' (key: ${options.key}, id: ${streamId}) with tracks: audio=${!!options.producers.audio}, video=${!!options.producers.video}`
            );

            return {
              streamId,
              remove: () => {
                channel.removeExternalStream(streamId);

                this.logPlugin(
                  pluginId,
                  'debug',
                  `Removed external stream '${options.title}' (key: ${options.key}, id: ${streamId})`
                );
              },
              update: (updateOptions) => {
                channel.updateExternalStream(streamId, updateOptions);

                this.logPlugin(
                  pluginId,
                  'debug',
                  `Updated external stream '${options.title}' (key: ${options.key}, id: ${streamId})`
                );
              }
            };
          },
          getListenInfo: () => VoiceRuntime.getListenInfo()
        }
      },
      commands: {
        register: <TArgs = void>(command: CommandDefinition<TArgs>) => {
          if (!this.commands.has(pluginId)) {
            this.commands.set(pluginId, []);
          }

          const pluginCommands = this.commands.get(pluginId)!;

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
            command
          });

          this.logPlugin(
            pluginId,
            'debug',
            `Registered command: ${command.name}${command.description ? ` - ${command.description}` : ''}`
          );
        }
      },
      settings: {
        register: (definitions) => {
          return this.registerSettings(pluginId, definitions) as ReturnType<
            PluginContext['settings']['register']
          >;
        }
      }
    };
  };

  private createUnloadContext = (pluginId: string): UnloadPluginContext => {
    return {
      log: (...message: unknown[]) => {
        this.logPlugin(pluginId, 'info', ...message);
      },
      debug: (...message: unknown[]) => {
        this.logPlugin(pluginId, 'debug', ...message);
      },
      error: (...message: unknown[]) => {
        this.logPlugin(pluginId, 'error', ...message);
      }
    };
  };
}

const pluginManager = new PluginManager();

export { pluginManager };
