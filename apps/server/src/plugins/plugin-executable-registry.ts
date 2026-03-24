import { getErrorMessage, type TInvokerContext } from '@sharkord/shared';
import { withTimeout } from './execution-timeout';
import type { PluginLogger } from './plugin-logger';
import type { PluginStateStore } from './plugin-state-store';

type TRegistryOptions<TDefinition, TRegistered> = {
  kind: 'command' | 'action';
  timeoutMs: number;
  toRegistered: (pluginId: string, definition: TDefinition) => TRegistered;
  getExecutor: (
    registered: TRegistered
  ) => ((ctx: TInvokerContext, input: unknown) => Promise<unknown>) | undefined;
};

class PluginExecutableRegistry<
  TDefinition extends { name: string; description?: string },
  TRegistered extends { pluginId: string; name: string; description?: string }
> {
  private pluginLogger: PluginLogger;
  private stateStore: PluginStateStore;
  private options: TRegistryOptions<TDefinition, TRegistered>;
  private entries = new Map<string, TRegistered[]>();

  constructor(
    options: TRegistryOptions<TDefinition, TRegistered>,
    pluginLogger: PluginLogger,
    stateStore: PluginStateStore
  ) {
    this.options = options;
    this.pluginLogger = pluginLogger;
    this.stateStore = stateStore;
  }

  protected registerDefinition = (
    pluginId: string,
    definition: TDefinition
  ) => {
    if (!this.entries.has(pluginId)) {
      this.entries.set(pluginId, []);
    }

    const pluginEntries = this.entries.get(pluginId)!;
    const existingIndex = pluginEntries.findIndex(
      (d) => d.name === definition.name
    );

    if (existingIndex !== -1) {
      this.pluginLogger.log(
        pluginId,
        'error',
        `${this.options.kind}: '${definition.name}' is already registered. Overwriting.`
      );

      pluginEntries.splice(existingIndex, 1);
    }

    pluginEntries.push(this.options.toRegistered(pluginId, definition));

    this.pluginLogger.log(
      pluginId,
      'debug',
      `Registered ${this.options.kind}: ${definition.name}${definition.description ? ` - ${definition.description}` : ''}`
    );
  };

  protected getDefinitions = (): Map<string, TRegistered[]> => {
    return this.entries;
  };

  public unload = (pluginId: string) => {
    const pluginEntries = this.entries.get(pluginId);

    if (!pluginEntries || pluginEntries.length === 0) {
      return;
    }

    const names = pluginEntries.map((entry) => entry.name);

    this.entries.delete(pluginId);

    this.pluginLogger.log(
      pluginId,
      'debug',
      `Unregistered ${names.length} ${this.options.kind}(s): ${names.join(', ')}`
    );
  };

  public execute = async <TInput = unknown>(
    pluginId: string,
    definitionName: string,
    invokerCtx: TInvokerContext,
    input: TInput
  ): Promise<unknown> => {
    if (!this.stateStore.isEnabled(pluginId)) {
      throw new Error(`Plugin '${pluginId}' is not enabled.`);
    }

    const definitions = this.entries.get(pluginId);

    if (!definitions) {
      throw new Error(
        `Plugin '${pluginId}' has no registered ${this.options.kind}.`
      );
    }

    const foundDefinition = definitions.find((definition) => {
      return definition.name === definitionName;
    });

    if (!foundDefinition) {
      throw new Error(
        `${this.options.kind} '${definitionName}' not found for plugin '${pluginId}'.`
      );
    }

    try {
      this.pluginLogger.log(
        pluginId,
        'debug',
        `Executing ${this.options.kind} '${definitionName}' with input:`,
        input
      );

      const executor = this.options.getExecutor(foundDefinition);

      if (!executor) {
        throw new Error(
          `${this.options.kind} '${definitionName}' from plugin '${pluginId}' has no execute handler.`
        );
      }

      return await withTimeout(
        executor(invokerCtx, input),
        this.options.timeoutMs,
        `${this.options.kind} '${definitionName}' from plugin '${pluginId}' exceeded timeout of ${this.options.timeoutMs}ms`
      );
    } catch (error) {
      const errorMessage = getErrorMessage(error);

      this.pluginLogger.log(
        pluginId,
        'error',
        `Error executing ${this.options.kind} '${definitionName}': ${errorMessage}`
      );

      throw error;
    }
  };

  public has = (pluginId: string, definitionName: string): boolean => {
    const definitions = this.entries.get(pluginId);

    if (!definitions) {
      return false;
    }

    return definitions.some((definition) => definition.name === definitionName);
  };
}

export { PluginExecutableRegistry };
