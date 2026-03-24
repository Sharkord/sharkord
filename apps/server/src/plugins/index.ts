import type {
  PluginContext,
  TCreateStreamOptions,
  TExternalStreamHandle,
  UnloadPluginContext
} from '@sharkord/plugin-sdk';
import {
  CLIENT_ENTRY_FILE,
  getErrorMessage,
  PLUGIN_SDK_VERSION,
  SERVER_ENTRY_FILE,
  ServerEvents,
  StreamKind,
  zPluginId,
  zPluginManifest,
  type TInvokerContext,
  type TPluginInfo,
  type TPluginManifest,
  type TPluginMetadata
} from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';
import { db } from '../db';
import { getSettings } from '../db/queries/server';
import { getPublicUserById, getPublicUsers } from '../db/queries/users';
import { channels } from '../db/schema';
import { PLUGINS_PATH } from '../helpers/paths';
import { logger } from '../logger';
import { VoiceRuntime } from '../runtimes/voice';
import { pubsub } from '../utils/pubsub';
import { ActionRegistry } from './action-registry';
import { createPluginMessage } from './actions/create-plugin-message';
import { deletePluginMessage } from './actions/delete-plugin-message';
import { editPluginMessage } from './actions/edit-plugin-message';
import { CommandRegistry } from './command-registry';
import { eventBus } from './event-bus';
import { HooksManager } from './hooks-manager';
import { PluginLogger } from './plugin-logger';
import { PluginSettingsManager } from './plugin-settings-manager';
import { PluginStateStore } from './plugin-state-store';

type PluginModule = {
  onLoad: (ctx: PluginContext) => void | Promise<void>;
  onUnload?: (ctx: UnloadPluginContext) => void | Promise<void>;
};

class PluginManager {
  private loadedPlugins = new Map<string, PluginModule>();
  private loadErrors = new Map<string, string>();
  private uiState = new Map<string, boolean>();

  private readonly stateStore = new PluginStateStore();
  private readonly pluginLogger = new PluginLogger();
  private readonly hooksManager = new HooksManager();

  private readonly settingsManager = new PluginSettingsManager(
    this.pluginLogger,
    this.stateStore
  );

  private readonly commandRegistry = new CommandRegistry(
    this.pluginLogger,
    this.stateStore
  );

  private readonly actionRegistry = new ActionRegistry(
    this.pluginLogger,
    this.stateStore
  );

  public isEnabled = (pluginId: string) => this.stateStore.isEnabled(pluginId);

  public getLogs = (pluginId: string) => this.pluginLogger.getLogs(pluginId);

  public onLog = (
    pluginId: string,
    listener: Parameters<PluginLogger['onLog']>[1]
  ) => this.pluginLogger.onLog(pluginId, listener);

  public getCommands = () => this.commandRegistry.getAll();

  public getCommandByName = (commandName: string | undefined) =>
    this.commandRegistry.getByName(commandName);

  public hasCommand = (pluginId: string, commandName: string) =>
    this.commandRegistry.has(pluginId, commandName);

  public executeCommand = <TArgs = unknown>(
    pluginId: string,
    commandName: string,
    invokerCtx: TInvokerContext,
    args: TArgs
  ) => this.commandRegistry.execute(pluginId, commandName, invokerCtx, args);

  public hasAction = (pluginId: string, actionName: string) =>
    this.actionRegistry.has(pluginId, actionName);

  public executeAction = <TPayload = unknown>(
    pluginId: string,
    actionName: string,
    invokerCtx: TInvokerContext,
    payload: TPayload
  ) => this.actionRegistry.execute(pluginId, actionName, invokerCtx, payload);

  public getPluginSettings = (pluginId: string) =>
    this.settingsManager.getSettings(pluginId);

  public updatePluginSetting = (
    pluginId: string,
    key: string,
    value: unknown
  ) => this.settingsManager.updateSetting(pluginId, key, value);

  public registerBeforeFileSaveHook = (
    ...args: Parameters<HooksManager['registerBeforeFileSave']>
  ) => this.hooksManager.registerBeforeFileSave(...args);

  public clearBeforeFileSaveHooks = () =>
    this.hooksManager.clearBeforeFileSaveHooks();

  public getBeforeFileSaveHooks = () =>
    this.hooksManager.getBeforeFileSaveHooks();

  public getPluginsFromPath = async (): Promise<string[]> => {
    const files = await fs.readdir(PLUGINS_PATH);

    const checks = files.map(async (file) => {
      try {
        const pluginPath = path.join(PLUGINS_PATH, file);
        const stat = await fs.stat(pluginPath);

        return stat.isDirectory() ? file : undefined;
      } catch {
        return undefined;
      }
    });

    const resolved = await Promise.all(checks);

    return resolved.filter((file) => Boolean(file)) as string[];
  };

  public getPluginIdsWithComponents = (): string[] => {
    const pluginIds = Array.from(this.loadedPlugins.keys());

    return pluginIds.filter((pluginId) => this.uiState.get(pluginId));
  };

  public getActivePluginMetadata = async (): Promise<TPluginMetadata[]> => {
    const pluginIds = Array.from(this.loadedPlugins.keys());

    const metadataResults: Array<TPluginMetadata | undefined> =
      await Promise.all(
        pluginIds.map(async (pluginId) => {
          try {
            const info = await this.getPluginInfo(pluginId);

            return {
              pluginId: info.id,
              name: info.name,
              description: info.description,
              avatarUrl: info.logo
            };
          } catch {
            return undefined;
          }
        })
      );

    return metadataResults.filter(
      (metadata) => !!metadata
    ) as TPluginMetadata[];
  };

  private validatePluginId = (pluginId: string) => {
    try {
      zPluginId.parse(pluginId);
    } catch {
      throw new Error(`Invalid plugin ID: '${pluginId}'`);
    }
  };

  private getPluginPath = (pluginId: string) => {
    this.validatePluginId(pluginId);

    return path.join(PLUGINS_PATH, pluginId);
  };

  private verifySdkVersion = (
    sdkVersion: number
  ): { isValid: boolean; error?: string } => {
    if (sdkVersion !== PLUGIN_SDK_VERSION) {
      return {
        isValid: false,
        error: `Plugin SDK version ${sdkVersion} is not compatible with server SDK version ${PLUGIN_SDK_VERSION}.`
      };
    }

    return { isValid: true };
  };

  public getPluginInfo = async (pluginId: string): Promise<TPluginInfo> => {
    await this.stateStore.ensure(pluginId);
    const pluginPath = this.getPluginPath(pluginId);
    const manifestPath = path.join(pluginPath, 'manifest.json');

    if (!(await fs.exists(manifestPath))) {
      throw new Error('manifest.json not found');
    }

    let manifest: TPluginManifest;

    try {
      manifest = zPluginManifest.parse(
        JSON.parse(await fs.readFile(manifestPath, 'utf-8'))
      );
    } catch (error) {
      throw new Error(`Invalid manifest.json: ${getErrorMessage(error)}`);
    }

    if (manifest.id !== pluginId) {
      throw new Error(
        `Plugin manifest id '${manifest.id}' must match plugin directory '${pluginId}'`
      );
    }

    const serverEntryPath = path.join(pluginPath, SERVER_ENTRY_FILE);
    const clientEntryPath = path.join(pluginPath, CLIENT_ENTRY_FILE);

    if (!(await fs.exists(serverEntryPath))) {
      throw new Error('Plugin server entry file not found');
    }

    if (!(await fs.exists(clientEntryPath))) {
      throw new Error('Plugin client entry file not found');
    }

    const loadError = this.loadErrors.get(pluginId);

    return {
      id: pluginId,
      enabled: this.stateStore.isEnabled(pluginId),
      name: manifest.name,
      path: pluginPath,
      description: manifest.description,
      version: manifest.version,
      sdkVersion: manifest.sdkVersion,
      logo: manifest.logo,
      author: manifest.author,
      homepage: manifest.homepage,
      loadError
    };
  };

  public loadPlugins = async () => {
    const settings = await getSettings();

    if (!settings.enablePlugins) return;

    await this.stateStore.loadAll();

    const files = await this.getPluginsFromPath();

    logger.info(`Loading ${files.length} plugins...`);

    const results = await Promise.allSettled(
      files.map((file) => this.load(file))
    );

    for (const [index, result] of results.entries()) {
      if (result.status === 'rejected') {
        logger.error(
          `Failed to load plugin ${files[index]}: %s`,
          getErrorMessage(result.reason)
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
          `Failed to unload plugin %s: %s`,
          pluginId,
          getErrorMessage(error)
        );
      }
    }
  };

  public togglePlugin = async (pluginId: string, enabled: boolean) => {
    await this.stateStore.ensure(pluginId);
    const wasEnabled = this.stateStore.isEnabled(pluginId);

    await this.stateStore.setEnabled(pluginId, enabled);

    if (wasEnabled && !enabled && this.loadedPlugins.has(pluginId)) {
      await this.unload(pluginId);
    }

    if (!wasEnabled && enabled && !this.loadedPlugins.has(pluginId)) {
      await this.load(pluginId);
    }
  };

  public load = async (pluginId: string) => {
    const { enablePlugins } = await getSettings();

    if (!enablePlugins) {
      throw new Error('Plugins are disabled.');
    }

    if (!this.stateStore.isEnabled(pluginId)) {
      this.pluginLogger.log(
        pluginId,
        'debug',
        `Plugin ${pluginId} is disabled; skipping load.`
      );
      return;
    }

    const info = await this.getPluginInfo(pluginId);

    const { isValid, error } = this.verifySdkVersion(info.sdkVersion);

    if (!isValid) {
      const errorMessage = error || 'Unknown SDK version error';

      this.loadErrors.set(pluginId, errorMessage);

      this.pluginLogger.log(
        pluginId,
        'error',
        `Failed to load plugin ${pluginId}: ${errorMessage}`
      );

      return;
    }

    try {
      const ctx = this.createContext(pluginId);
      const mod = await import(path.join(info.path, SERVER_ENTRY_FILE));

      if (typeof mod.onLoad !== 'function') {
        throw new Error(
          `Plugin ${pluginId} does not export an 'onLoad' function`
        );
      }

      await mod.onLoad(ctx);

      this.loadedPlugins.set(pluginId, mod);
      this.loadErrors.delete(pluginId);

      this.pluginLogger.log(
        pluginId,
        'info',
        `Plugin loaded: ${pluginId}@v${info.version} by ${info.author}`
      );
    } catch (error) {
      const errorMessage = getErrorMessage(error);

      this.loadErrors.set(pluginId, errorMessage);

      this.pluginLogger.log(
        pluginId,
        'error',
        `Failed to load plugin ${pluginId}: ${errorMessage}`
      );

      await this.unload(pluginId);
    }
  };

  public unload = async (pluginId: string) => {
    const pluginModule = this.loadedPlugins.get(pluginId);

    if (!pluginModule) {
      this.pluginLogger.log(
        pluginId,
        'debug',
        `Plugin ${pluginId} is not loaded; nothing to unload.`
      );
      return;
    }

    if (typeof pluginModule.onUnload === 'function') {
      try {
        const unloadCtx: UnloadPluginContext =
          this.createUnloadContext(pluginId);

        await pluginModule.onUnload(unloadCtx);
      } catch (error) {
        logger.error(
          'Error in plugin %s onUnload: %s',
          pluginId,
          getErrorMessage(error)
        );
      }
    }

    eventBus.unload(pluginId);
    this.commandRegistry.unload(pluginId);
    this.actionRegistry.unload(pluginId);
    this.settingsManager.unload(pluginId);
    this.hooksManager.unload(pluginId);
    this.uiState.delete(pluginId);
    this.loadedPlugins.delete(pluginId);
    this.loadErrors.delete(pluginId);

    logger.info(`Plugin unloaded: ${pluginId}`);
  };

  public removePlugin = async (pluginId: string) => {
    await this.unload(pluginId);

    const pluginPath = this.getPluginPath(pluginId);

    try {
      await fs.rm(pluginPath, { recursive: true, force: true });

      logger.debug(`Plugin removed: ${pluginId}`);
    } catch (error) {
      logger.error(
        `Failed to remove plugin ${pluginId}: %s`,
        getErrorMessage(error)
      );

      throw new Error(`Failed to remove plugin: ${getErrorMessage(error)}`);
    }
  };

  private createContext = (pluginId: string): PluginContext => {
    const scopedLogger = this.pluginLogger.createScopedLogger(pluginId);

    return {
      path: this.getPluginPath(pluginId),
      logger: scopedLogger,
      ...scopedLogger,
      events: {
        on: (event, handler) => {
          return eventBus.register(pluginId, event, handler);
        },
        off: (event, handler) => {
          eventBus.unregister(pluginId, event, handler);
        }
      },
      ui: {
        enable: () => {
          this.uiState.set(pluginId, true);
          pubsub.publish(
            ServerEvents.PLUGIN_COMPONENTS_CHANGE,
            this.getPluginIdsWithComponents()
          );
        },
        disable: () => {
          this.uiState.set(pluginId, false);
          pubsub.publish(
            ServerEvents.PLUGIN_COMPONENTS_CHANGE,
            this.getPluginIdsWithComponents()
          );
        }
      },
      actions: {
        register: (action) => {
          this.actionRegistry.register(pluginId, action);
        }
      },
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

          scopedLogger.debug(
            `Created external stream '${options.title}' (key: ${options.key}, id: ${streamId}) with tracks: audio=${!!options.producers.audio}, video=${!!options.producers.video}`
          );

          return {
            streamId,
            remove: () => {
              channel.removeExternalStream(streamId);

              scopedLogger.debug(
                `Removed external stream '${options.title}' (key: ${options.key}, id: ${streamId})`
              );
            },
            update: (updateOptions) => {
              channel.updateExternalStream(streamId, updateOptions);

              scopedLogger.debug(
                `Updated external stream '${options.title}' (key: ${options.key}, id: ${streamId})`
              );
            }
          };
        },
        getListenInfo: () => VoiceRuntime.getListenInfo()
      },
      messages: {
        send: async (channelId: number, content: string) =>
          createPluginMessage({
            pluginId,
            channelId,
            content
          }),
        edit: async (messageId: number, content: string) =>
          editPluginMessage({
            pluginId,
            messageId,
            content
          }),
        delete: async (messageId: number) =>
          deletePluginMessage({
            pluginId,
            messageId
          })
      },
      commands: {
        register: (command) => {
          this.commandRegistry.register(pluginId, command);
        }
      },
      settings: {
        register: (definitions) => {
          return this.settingsManager.register(
            pluginId,
            definitions
          ) as ReturnType<PluginContext['settings']['register']>;
        }
      },
      hooks: {
        onBeforeFileSave: (handler) => {
          this.hooksManager.registerBeforeFileSave(pluginId, handler);
        }
      },
      data: {
        getUser: async (userId: number) => {
          return getPublicUserById(userId);
        },
        getChannel: async (channelId: number) => {
          return db
            .select()
            .from(channels)
            .where(eq(channels.id, channelId))
            .get();
        },
        getPublicUsers: async () => {
          return getPublicUsers();
        }
      }
    };
  };

  private createUnloadContext = (pluginId: string): UnloadPluginContext => {
    const baseContext = this.createContext(pluginId);

    return {
      path: baseContext.path,
      logger: baseContext.logger,
      log: baseContext.log,
      debug: baseContext.debug,
      error: baseContext.error,
      voice: baseContext.voice,
      messages: baseContext.messages,
      ui: baseContext.ui
    };
  };
}

const pluginManager = new PluginManager();

export { pluginManager };
