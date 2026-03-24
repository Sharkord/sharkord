import type {
  ActionDefinition,
  RegisteredAction,
  TInvokerContext
} from '@sharkord/shared';
import type { PluginLogger } from './plugin-logger';
import type { PluginStateStore } from './plugin-state-store';

class ActionRegistry {
  private pluginLogger: PluginLogger;
  private stateStore: PluginStateStore;
  private actions = new Map<string, RegisteredAction[]>();

  constructor(pluginLogger: PluginLogger, stateStore: PluginStateStore) {
    this.pluginLogger = pluginLogger;
    this.stateStore = stateStore;
  }

  public register = <TPayload = void>(
    pluginId: string,
    action: ActionDefinition<TPayload>
  ) => {
    if (!action.execute) {
      throw new Error(
        `Action '${action.name}' must define an execute() method.`
      );
    }

    if (!this.actions.has(pluginId)) {
      this.actions.set(pluginId, []);
    }

    const pluginActions = this.actions.get(pluginId)!;

    const existingIndex = pluginActions.findIndex(
      (a) => a.name === action.name
    );

    if (existingIndex !== -1) {
      this.pluginLogger.log(
        pluginId,
        'error',
        `Action '${action.name}' is already registered. Overwriting.`
      );
      pluginActions.splice(existingIndex, 1);
    }

    pluginActions.push({
      pluginId,
      name: action.name,
      description: action.description,
      action: action as ActionDefinition<unknown>
    });

    this.pluginLogger.log(
      pluginId,
      'debug',
      `Registered action: ${action.name}${action.description ? ` - ${action.description}` : ''}`
    );
  };

  public unload = (pluginId: string) => {
    const pluginActions = this.actions.get(pluginId);

    if (!pluginActions || pluginActions.length === 0) {
      return;
    }

    const actionNames = pluginActions.map((a) => a.name);

    this.actions.delete(pluginId);

    this.pluginLogger.log(
      pluginId,
      'debug',
      `Unregistered ${actionNames.length} action(s): ${actionNames.join(', ')}`
    );
  };

  public execute = async <TPayload = unknown>(
    pluginId: string,
    actionName: string,
    invokerCtx: TInvokerContext,
    payload: TPayload
  ): Promise<unknown> => {
    if (!this.stateStore.isEnabled(pluginId)) {
      throw new Error(`Plugin '${pluginId}' is not enabled.`);
    }

    const actions = this.actions.get(pluginId);

    if (!actions) {
      throw new Error(`Plugin '${pluginId}' has no registered actions.`);
    }

    const foundAction = actions.find((a) => a.name === actionName);

    if (!foundAction) {
      throw new Error(
        `Action '${actionName}' not found for plugin '${pluginId}'.`
      );
    }

    try {
      this.pluginLogger.log(
        pluginId,
        'debug',
        `Executing action '${actionName}' with payload:`,
        payload
      );

      const executorFn = foundAction.action.execute;

      if (!executorFn) {
        throw new Error(
          `Action '${actionName}' from plugin '${pluginId}' has no execute handler.`
        );
      }

      return await executorFn(invokerCtx, payload);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.pluginLogger.log(
        pluginId,
        'error',
        `Error executing action '${actionName}': ${errorMessage}`
      );

      throw error;
    }
  };

  public has = (pluginId: string, actionName: string): boolean => {
    const actions = this.actions.get(pluginId);

    if (!actions) {
      return false;
    }

    return actions.some((a) => a.name === actionName);
  };
}

export { ActionRegistry };
