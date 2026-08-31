import { getErrorMessage, type TInvokerContext } from '@sharkord/shared';
import { withTimeout } from './execution-timeout';
import type { PluginLogger } from './plugin-logger';
import type { PluginStateStore } from './plugin-state-store';

type TExecutableDefinition = {
  name: string;
  description?: string;
  execute: (ctx: TInvokerContext, input: never) => Promise<unknown>;
};

const MAX_REGISTRATIONS_PER_PLUGIN = 100;

// commands and actions are the same thing with a different invocation surface, so
// they are two instances of this rather than two registries
class PluginRegistry<TDefinition extends TExecutableDefinition> {
  private entries = new Map<string, Map<string, TDefinition>>();

  constructor(
    private readonly kind: 'command' | 'action',
    private readonly timeoutMs: number,
    private readonly pluginLogger: PluginLogger,
    private readonly stateStore: PluginStateStore
  ) {}

  public register = (pluginId: string, definition: TDefinition) => {
    if (typeof definition.execute !== 'function') {
      throw new Error(
        `${this.kind} '${definition.name}' must define an execute() method.`
      );
    }

    const pluginEntries = this.entries.get(pluginId) ?? new Map();

    if (
      !pluginEntries.has(definition.name) &&
      pluginEntries.size >= MAX_REGISTRATIONS_PER_PLUGIN
    ) {
      throw new Error(
        `Plugin '${pluginId}' exceeded the maximum of ${MAX_REGISTRATIONS_PER_PLUGIN} ${this.kind} registrations.`
      );
    }

    if (pluginEntries.has(definition.name)) {
      this.pluginLogger.log(
        pluginId,
        'error',
        `${this.kind}: '${definition.name}' is already registered. Overwriting.`
      );
    }

    pluginEntries.set(definition.name, definition);
    this.entries.set(pluginId, pluginEntries);

    this.pluginLogger.log(
      pluginId,
      'debug',
      `Registered ${this.kind}: ${definition.name}${definition.description ? ` - ${definition.description}` : ''}`
    );
  };

  public getByPlugin = (): ReadonlyMap<
    string,
    ReadonlyMap<string, TDefinition>
  > => this.entries;

  public get = (pluginId: string, name: string): TDefinition | undefined =>
    this.entries.get(pluginId)?.get(name);

  public has = (pluginId: string, name: string): boolean =>
    this.entries.get(pluginId)?.has(name) ?? false;

  public unload = (pluginId: string) => {
    const pluginEntries = this.entries.get(pluginId);

    if (!pluginEntries || pluginEntries.size === 0) return;

    const names = Array.from(pluginEntries.keys());

    this.entries.delete(pluginId);

    this.pluginLogger.log(
      pluginId,
      'debug',
      `Unregistered ${names.length} ${this.kind}(s): ${names.join(', ')}`
    );
  };

  public execute = async <TInput = unknown>(
    pluginId: string,
    name: string,
    invokerCtx: TInvokerContext,
    input: TInput
  ): Promise<unknown> => {
    if (!this.stateStore.isEnabled(pluginId)) {
      throw new Error(`Plugin '${pluginId}' is not enabled.`);
    }

    const pluginEntries = this.entries.get(pluginId);

    if (!pluginEntries) {
      throw new Error(`Plugin '${pluginId}' has no registered ${this.kind}.`);
    }

    const definition = pluginEntries.get(name);

    if (!definition) {
      throw new Error(
        `${this.kind} '${name}' not found for plugin '${pluginId}'.`
      );
    }

    try {
      // the input is not logged: command arguments can be flagged sensitive and
      // plugin logs are readable by anyone who can manage plugins
      this.pluginLogger.log(
        pluginId,
        'debug',
        `Executing ${this.kind} '${name}'`
      );

      return await withTimeout(
        definition.execute(invokerCtx, input as never),
        this.timeoutMs,
        `${this.kind} '${name}' from plugin '${pluginId}' exceeded timeout of ${this.timeoutMs}ms`
      );
    } catch (error) {
      this.pluginLogger.log(
        pluginId,
        'error',
        `Error executing ${this.kind} '${name}': ${getErrorMessage(error)}`
      );

      throw error;
    }
  };
}

export { PluginRegistry };
export type { TExecutableDefinition };
