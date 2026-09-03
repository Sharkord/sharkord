import type {
  ActionDefinition,
  CommandDefinition,
  PluginContext,
  PluginModule,
  TPluginHttpMethod,
  TUpgradeInfo
} from '@sharkord/plugin-sdk';
import {
  assertSdkVersionCompatibility,
  getErrorMessage,
  Permission,
  PluginCapabilityType,
  PluginSlot,
  ServerEvents,
  zPluginManifest,
  type RegisteredCommand,
  type TCommandsMapByPlugin,
  type TInvokerContext,
  type TPluginInfo,
  type TPluginManifest,
  type TPluginMetadata,
  type TPluginSettingDefinition,
  type TPluginSlotRequirements
} from '@sharkord/shared';
import { watch } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';
import { deletePluginCapabilities } from '../db/queries/plugin-capabilities';
import { deleteAllPluginUserData } from '../db/queries/plugin-user-data';
import { getSettings } from '../db/queries/server';
import { PLUGINS_PATH } from '../helpers/paths';
import {
  getPluginClientEntryPath,
  getPluginDataPath,
  getPluginPath,
  getPluginServerEntryPath
} from '../helpers/plugin-paths';
import { logger } from '../logger';
import { ensureDir } from '../utils/fs';
import { pubsub } from '../utils/pubsub';
import {
  createContext,
  createUnloadContext,
  createUpgradeContext
} from './create-context';
import { eventBus } from './event-bus';
import {
  ACTION_EXECUTION_TIMEOUT_MS,
  COMMAND_EXECUTION_TIMEOUT_MS,
  LIFECYCLE_TIMEOUT_MS,
  withTimeout
} from './execution-timeout';
import {
  HooksManager,
  type THookHandlers,
  type THookName
} from './hooks-manager';
import { PluginHttpRouteRegistry } from './http-route-registry';
import { pluginLogger } from './plugin-logger';
import { PluginSettingsManager } from './plugin-settings-manager';
import { PluginStateStore } from './plugin-state-store';
import { PluginRegistry } from './registry';

const PLUGIN_WATCH_DEBOUNCE_MS = 2_000;

type TPluginCapabilityRequirement = {
  pluginId: string;
  type: PluginCapabilityType;
  name: string;
  requires: Permission;
};

class PluginManager {
  private loadedPlugins = new Map<string, PluginModule>();
  // the manifest of every loaded plugin, so publishing metadata does not have to
  // re-read and re-parse every manifest.json off disk
  private loadedManifests = new Map<string, TPluginManifest>();
  private loadErrors = new Map<string, string>();
  private pluginsWithUi = new Set<string>();

  // what each plugin declared its slots need, from ctx.ui.enable(). a slot that
  // is not in here is public
  private componentRequirements = new Map<string, TPluginSlotRequirements>();

  private installing = new Set<string>();
  private watchDebounce?: NodeJS.Timeout;

  private readonly stateStore = new PluginStateStore();
  private readonly pluginLogger = pluginLogger;
  private readonly hooksManager = new HooksManager();
  private readonly httpRouteRegistry = new PluginHttpRouteRegistry(
    this.pluginLogger
  );

  private readonly settingsManager = new PluginSettingsManager(
    this.pluginLogger,
    this.stateStore
  );

  private readonly commandRegistry = new PluginRegistry<
    CommandDefinition<unknown>
  >(
    'command',
    COMMAND_EXECUTION_TIMEOUT_MS,
    this.pluginLogger,
    this.stateStore
  );

  private readonly actionRegistry = new PluginRegistry<
    ActionDefinition<unknown>
  >('action', ACTION_EXECUTION_TIMEOUT_MS, this.pluginLogger, this.stateStore);

  public isEnabled = (pluginId: string) => this.stateStore.isEnabled(pluginId);

  public getLogs = (pluginId: string) => this.pluginLogger.getLogs(pluginId);

  public hasCommand = (pluginId: string, commandName: string) =>
    this.commandRegistry.has(pluginId, commandName);

  public executeCommand = <TArgs = unknown>(
    pluginId: string,
    commandName: string,
    invokerCtx: TInvokerContext,
    args: TArgs
  ) => this.commandRegistry.execute(pluginId, commandName, invokerCtx, args);

  public getActionNames = (pluginId: string): string[] =>
    Array.from(this.actionRegistry.getByPlugin().get(pluginId)?.keys() ?? []);

  public hasAction = (pluginId: string, actionName: string) =>
    this.actionRegistry.has(pluginId, actionName);

  public getRequiredPermission = (
    pluginId: string,
    type: PluginCapabilityType,
    name: string
  ): Permission | undefined => {
    if (type === PluginCapabilityType.COMMAND)
      return this.commandRegistry.get(pluginId, name)?.requires;

    if (type === PluginCapabilityType.ACTION)
      return this.actionRegistry.get(pluginId, name)?.requires;

    return this.componentRequirements.get(pluginId)?.[name as PluginSlot];
  };

  public getComponentRequirements = (): ReadonlyMap<
    string,
    TPluginSlotRequirements
  > => this.componentRequirements;

  public getCapabilityRequirements = (): TPluginCapabilityRequirement[] => {
    const requirements: TPluginCapabilityRequirement[] = [];

    const collect = (
      type: PluginCapabilityType,
      byPlugin: ReadonlyMap<
        string,
        ReadonlyMap<string, { requires?: Permission }>
      >
    ) => {
      for (const [pluginId, entries] of byPlugin) {
        for (const [name, definition] of entries) {
          if (!definition.requires) continue;

          requirements.push({
            pluginId,
            type,
            name,
            requires: definition.requires
          });
        }
      }
    };

    collect(PluginCapabilityType.COMMAND, this.commandRegistry.getByPlugin());
    collect(PluginCapabilityType.ACTION, this.actionRegistry.getByPlugin());

    for (const [pluginId, slots] of this.componentRequirements) {
      for (const [name, requires] of Object.entries(slots)) {
        if (!requires) continue;

        requirements.push({
          pluginId,
          type: PluginCapabilityType.COMPONENT,
          name,
          requires
        });
      }
    }

    return requirements;
  };

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

  public registerHook = <TName extends THookName>(
    name: TName,
    pluginId: string,
    handler: THookHandlers[TName]
  ) => this.hooksManager.register(name, pluginId, handler);

  public getHooks = <TName extends THookName>(name: TName) =>
    this.hooksManager.get(name);

  public clearHooks = () => this.hooksManager.clearAll();

  public getCommands = (): TCommandsMapByPlugin => {
    const allCommands: TCommandsMapByPlugin = {};

    for (const [pluginId, commands] of this.commandRegistry.getByPlugin()) {
      allCommands[pluginId] = Array.from(commands.values()).map(
        ({ name, description, args }) => ({
          pluginId,
          name,
          description,
          args
        })
      );
    }

    return allCommands;
  };

  // commands are addressed by bare name in chat, so the first plugin to claim a
  // name keeps it. registerCommand warns the loser
  public getCommandByName = (
    commandName: string | undefined
  ): RegisteredCommand | undefined => {
    if (!commandName) return undefined;

    for (const [pluginId, commands] of this.commandRegistry.getByPlugin()) {
      const command = commands.get(commandName);

      if (!command) continue;

      return {
        pluginId,
        name: command.name,
        description: command.description,
        args: command.args,
        command
      };
    }

    return undefined;
  };

  public getHttpRoute = (
    pluginId: string,
    method: TPluginHttpMethod,
    routePath: string
  ) => {
    if (!this.loadedPlugins.has(pluginId)) return undefined;
    if (!this.stateStore.isEnabled(pluginId)) return undefined;

    return this.httpRouteRegistry.get(pluginId, method, routePath);
  };

  public getPluginsFromPath = async (): Promise<string[]> => {
    const entries = await fs.readdir(PLUGINS_PATH, { withFileTypes: true });

    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  };

  public getPluginIdsWithComponents = (): string[] =>
    Array.from(this.loadedPlugins.keys()).filter((pluginId) =>
      this.pluginsWithUi.has(pluginId)
    );

  // the only thing a command chip needs off the manifest, and it is on the hot
  // path of every command sent in chat
  public getPluginLogo = (pluginId: string): string | undefined =>
    this.loadedManifests.get(pluginId)?.logo;

  public getActivePluginMetadata = (): TPluginMetadata[] =>
    Array.from(this.loadedManifests.entries()).map(([pluginId, manifest]) => ({
      pluginId,
      name: manifest.name,
      description: manifest.description,
      version: manifest.version,
      avatarUrl: manifest.logo
    }));

  public publishPlugins = () => {
    pubsub.publish(ServerEvents.PLUGIN_COMMANDS_CHANGE, this.getCommands());
    pubsub.publish(
      ServerEvents.PLUGIN_METADATA_CHANGE,
      this.getActivePluginMetadata()
    );
    pubsub.publish(
      ServerEvents.PLUGIN_COMPONENTS_CHANGE,
      this.getPluginIdsWithComponents()
    );
  };

  private invalidateDynamicImportCache = (pluginPath: string) => {
    const serverEntryPath = getPluginServerEntryPath(pluginPath);

    for (const cacheKey of Object.keys(require.cache ?? {})) {
      if (!cacheKey.startsWith(serverEntryPath)) continue;
      if (!require.cache?.[cacheKey]) continue;

      logger.debug(`Deleting dynamic import cache for module: ${cacheKey}`);

      delete require.cache[cacheKey];
    }
  };

  private readManifest = async (pluginId: string): Promise<TPluginManifest> => {
    const pluginPath = getPluginPath(pluginId);
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

    const [hasServerEntry, hasClientEntry] = await Promise.all([
      fs.exists(getPluginServerEntryPath(pluginPath)),
      fs.exists(getPluginClientEntryPath(pluginPath))
    ]);

    if (!hasServerEntry) {
      throw new Error('Plugin server entry file not found');
    }

    if (!hasClientEntry) {
      throw new Error('Plugin client entry file not found');
    }

    return manifest;
  };

  public getPluginInfo = async (pluginId: string): Promise<TPluginInfo> => {
    await this.stateStore.ensure(pluginId);

    const manifest = await this.readManifest(pluginId);

    return {
      id: pluginId,
      enabled: this.stateStore.isEnabled(pluginId),
      path: getPluginPath(pluginId),
      name: manifest.name,
      description: manifest.description,
      version: manifest.version,
      sdkVersion: manifest.sdkVersion,
      logo: manifest.logo,
      author: manifest.author,
      homepage: manifest.homepage,
      loadError: this.loadErrors.get(pluginId)
    };
  };

  // a plugin whose manifest or entry files are broken has no info to report, but
  // it still has to show up in the admin list with the reason it is broken
  public getPluginInfoOrPlaceholder = async (
    pluginId: string
  ): Promise<TPluginInfo> => {
    try {
      return await this.getPluginInfo(pluginId);
    } catch (error) {
      return {
        id: pluginId,
        enabled: this.stateStore.isEnabled(pluginId),
        path: getPluginPath(pluginId),
        name: pluginId,
        description: '',
        version: '',
        sdkVersion: 0,
        logo: undefined,
        author: '',
        homepage: undefined,
        loadError: getErrorMessage(error)
      };
    }
  };

  public markInstalling = (pluginId: string) => {
    this.installing.add(pluginId);
  };

  public clearInstalling = (pluginId: string) => {
    this.installing.delete(pluginId);
  };

  public reconcileRemovedPlugins = async () => {
    for (const pluginId of this.stateStore.knownPluginIds()) {
      if (this.installing.has(pluginId)) continue;
      if (await fs.exists(getPluginPath(pluginId))) continue;

      logger.warn(
        `Plugin ${pluginId} is no longer on disk, treating it as uninstalled.`
      );

      if (this.stateStore.isEnabled(pluginId)) {
        await this.togglePlugin(pluginId, false);
      }

      await this.removePlugin(pluginId);
      this.publishPlugins();
    }
  };

  private watchPluginsDirectory = () => {
    try {
      watch(PLUGINS_PATH, () => {
        clearTimeout(this.watchDebounce);

        this.watchDebounce = setTimeout(() => {
          this.reconcileRemovedPlugins().catch((error) =>
            logger.error(
              'Failed to reconcile removed plugins: %s',
              getErrorMessage(error)
            )
          );
        }, PLUGIN_WATCH_DEBOUNCE_MS);
      });
    } catch (error) {
      logger.error(
        'Could not watch the plugins directory: %s',
        getErrorMessage(error)
      );
    }
  };

  public init = async () => {
    await this.loadPlugins();
    await this.reconcileRemovedPlugins();

    this.watchPluginsDirectory();
  };

  public loadPlugins = async () => {
    const { enablePlugins } = await getSettings();

    if (!enablePlugins) return;

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
    for (const pluginId of Array.from(this.loadedPlugins.keys())) {
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

    // a plugin that is not on disk at all must not get an enabled state written
    // for it. a plugin that is there but broken still can: load() records why
    if (enabled && !(await fs.exists(getPluginPath(pluginId)))) {
      throw new Error(`Plugin '${pluginId}' was not found.`);
    }

    const wasEnabled = this.stateStore.isEnabled(pluginId);

    await this.stateStore.setEnabled(pluginId, enabled);

    if (wasEnabled && !enabled && this.loadedPlugins.has(pluginId)) {
      await this.unload(pluginId);
    }

    if (!wasEnabled && enabled && !this.loadedPlugins.has(pluginId)) {
      await this.load(pluginId);
    }
  };

  private setUiEnabled = (
    pluginId: string,
    enabled: boolean,
    requirements?: TPluginSlotRequirements
  ) => {
    if (enabled) {
      this.pluginsWithUi.add(pluginId);
      this.componentRequirements.set(pluginId, requirements ?? {});
    } else {
      this.pluginsWithUi.delete(pluginId);
      this.componentRequirements.delete(pluginId);
    }

    pubsub.publish(
      ServerEvents.PLUGIN_COMPONENTS_CHANGE,
      this.getPluginIdsWithComponents()
    );
  };

  private registerCommand = (
    pluginId: string,
    command: CommandDefinition<unknown>
  ) => {
    const existing = this.getCommandByName(command.name);

    if (existing && existing.pluginId !== pluginId) {
      this.pluginLogger.log(
        pluginId,
        'error',
        `command: '${command.name}' is already registered by plugin '${existing.pluginId}' and will not be reachable from chat.`
      );
    }

    this.commandRegistry.register(pluginId, command);

    pubsub.publish(ServerEvents.PLUGIN_COMMANDS_CHANGE, this.getCommands());
  };

  public load = async (pluginId: string) => {
    const { enablePlugins } = await getSettings();

    if (!enablePlugins) {
      throw new Error('Plugins are disabled.');
    }

    await this.stateStore.ensure(pluginId);

    if (!this.stateStore.isEnabled(pluginId)) {
      this.pluginLogger.log(
        pluginId,
        'debug',
        `Plugin ${pluginId} is disabled; skipping load.`
      );

      return;
    }

    const pluginPath = getPluginPath(pluginId);

    try {
      const manifest = await this.readManifest(pluginId);

      assertSdkVersionCompatibility(manifest.sdkVersion);

      const scopedLogger = this.pluginLogger.createScopedLogger(pluginId);
      const dataPath = getPluginDataPath(pluginId);

      await ensureDir(dataPath);

      const ctx = createContext({
        pluginId,
        scopedLogger,
        pluginPath,
        dataPath,
        setUiEnabled: (enabled, requirements) =>
          this.setUiEnabled(pluginId, enabled, requirements),
        registerAction: (action) =>
          this.actionRegistry.register(
            pluginId,
            action as ActionDefinition<unknown>
          ),
        registerCommand: (command) =>
          this.registerCommand(pluginId, command as CommandDefinition<unknown>),
        // the manager stores definitions untyped, the sdk keys PluginSettings to
        // the literal definitions the plugin passed in
        registerSettings: ((definitions: TPluginSettingDefinition[]) =>
          this.settingsManager.register(
            pluginId,
            definitions
          )) as PluginContext['settings']['register'],
        registerBeforeFileSave: (handler) =>
          this.hooksManager.register('beforeFileSave', pluginId, handler),
        registerBeforeMessageSave: (handler) =>
          this.hooksManager.register('beforeMessageSave', pluginId, handler),
        registerBeforeChannelCreate: (handler) =>
          this.hooksManager.register('beforeChannelCreate', pluginId, handler),
        registerBeforeVoiceJoin: (handler) =>
          this.hooksManager.register('beforeVoiceJoin', pluginId, handler),
        registerBeforeLogin: (handler) =>
          this.hooksManager.register('beforeLogin', pluginId, handler),
        registerHttpRoute: (method, routePath, handler, options) =>
          this.httpRouteRegistry.register(
            pluginId,
            method,
            routePath,
            handler,
            options
          )
      });

      const moduleSpecifier = pathToFileURL(
        getPluginServerEntryPath(pluginPath)
      ).href;

      const mod = await import(moduleSpecifier);

      if (typeof mod.onLoad !== 'function') {
        throw new Error(
          `Plugin ${pluginId} does not export an 'onLoad' function`
        );
      }

      if (typeof mod.onUnload !== 'function') {
        logger.warn(
          "Plugin %s does not export an 'onUnload' function. This will be required in a future SDK version.",
          pluginId
        );
      }

      const previousVersion = await this.stateStore.getLoadedVersion(pluginId);

      if (previousVersion && previousVersion !== manifest.version) {
        await this.runUpgrade(mod, pluginId, {
          previousVersion,
          version: manifest.version
        });
      }

      await withTimeout(
        Promise.resolve().then(() => mod.onLoad(ctx)),
        LIFECYCLE_TIMEOUT_MS,
        `Plugin ${pluginId} onLoad exceeded timeout of ${LIFECYCLE_TIMEOUT_MS}ms`
      );

      await this.stateStore.setLoadedVersion(pluginId, manifest.version);

      this.loadedPlugins.set(pluginId, mod);
      this.loadedManifests.set(pluginId, manifest);
      this.loadErrors.delete(pluginId);

      this.pluginLogger.log(
        pluginId,
        'info',
        `Plugin loaded: ${pluginId}@v${manifest.version} by ${manifest.author}`
      );
    } catch (error) {
      const errorMessage = getErrorMessage(error);

      this.loadErrors.set(pluginId, errorMessage);

      this.pluginLogger.log(
        pluginId,
        'error',
        `Failed to load plugin ${pluginId}: ${errorMessage}`
      );

      this.forget(pluginId);
      this.invalidateDynamicImportCache(pluginPath);
    }
  };

  private runUpgrade = async (
    mod: PluginModule,
    pluginId: string,
    info: TUpgradeInfo
  ) => {
    if (typeof mod.onUpgrade !== 'function') return;

    this.pluginLogger.log(
      pluginId,
      'info',
      `Upgrading from v${info.previousVersion} to v${info.version}`
    );

    const upgradeCtx = createUpgradeContext({
      pluginId,
      scopedLogger: this.pluginLogger.createScopedLogger(pluginId),
      pluginPath: getPluginPath(pluginId),
      dataPath: getPluginDataPath(pluginId)
    });

    await withTimeout(
      Promise.resolve().then(() => mod.onUpgrade?.(upgradeCtx, info)),
      LIFECYCLE_TIMEOUT_MS,
      `Plugin ${pluginId} onUpgrade exceeded timeout of ${LIFECYCLE_TIMEOUT_MS}ms`
    );
  };

  private forget = (pluginId: string) => {
    eventBus.unload(pluginId);
    this.commandRegistry.unload(pluginId);
    this.actionRegistry.unload(pluginId);
    this.settingsManager.unload(pluginId);
    this.hooksManager.unload(pluginId);
    this.httpRouteRegistry.unload(pluginId);
    this.pluginsWithUi.delete(pluginId);
    this.componentRequirements.delete(pluginId);
    this.loadedManifests.delete(pluginId);
    this.loadedPlugins.delete(pluginId);
  };

  public unload = async (pluginId: string) => {
    const pluginModule = this.loadedPlugins.get(pluginId);
    const pluginPath = getPluginPath(pluginId);

    if (!pluginModule) {
      this.pluginLogger.log(
        pluginId,
        'debug',
        `Plugin ${pluginId} is not loaded; nothing to unload.`
      );

      return;
    }

    try {
      const unloadCtx = createUnloadContext({
        pluginId,
        scopedLogger: this.pluginLogger.createScopedLogger(pluginId),
        pluginPath,
        dataPath: getPluginDataPath(pluginId),
        setUiEnabled: (enabled) => this.setUiEnabled(pluginId, enabled)
      });

      await withTimeout(
        Promise.resolve().then(() => pluginModule.onUnload?.(unloadCtx)),
        LIFECYCLE_TIMEOUT_MS,
        `Plugin ${pluginId} onUnload exceeded timeout of ${LIFECYCLE_TIMEOUT_MS}ms`
      );
    } catch (error) {
      logger.error(
        'Error in plugin %s onUnload: %s',
        pluginId,
        getErrorMessage(error)
      );
    }

    this.forget(pluginId);
    this.loadErrors.delete(pluginId);
    this.invalidateDynamicImportCache(pluginPath);

    logger.info(`Plugin unloaded: ${pluginId}`);
  };

  public removePlugin = async (pluginId: string) => {
    await this.unload(pluginId);

    const pluginPath = getPluginPath(pluginId);

    try {
      await fs.rm(pluginPath, { recursive: true, force: true });
    } catch (error) {
      logger.error(
        `Failed to remove plugin ${pluginId}: %s`,
        getErrorMessage(error)
      );

      throw new Error(`Failed to remove plugin: ${getErrorMessage(error)}`);
    }

    try {
      await fs.rm(getPluginDataPath(pluginId), {
        recursive: true,
        force: true
      });
    } catch (error) {
      logger.error(
        `Failed to remove plugin data for ${pluginId}: %s`,
        getErrorMessage(error)
      );
    }

    await deletePluginCapabilities(pluginId);
    await deleteAllPluginUserData(pluginId);
    await this.stateStore.remove(pluginId);

    // nothing on disk to attribute them to any more
    this.forget(pluginId);
    this.loadErrors.delete(pluginId);
    this.pluginLogger.clear(pluginId);

    logger.debug(`Plugin removed: ${pluginId}`);
  };
}

const pluginManager = new PluginManager();

export { pluginManager };
