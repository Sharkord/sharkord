import type { ActionDefinition, RegisteredAction } from '@sharkord/shared';
import { ACTION_EXECUTION_TIMEOUT_MS } from './execution-timeout';
import { PluginExecutableRegistry } from './plugin-executable-registry';
import type { PluginLogger } from './plugin-logger';
import type { PluginStateStore } from './plugin-state-store';

class ActionRegistry extends PluginExecutableRegistry<
  ActionDefinition<unknown>,
  RegisteredAction
> {
  constructor(pluginLogger: PluginLogger, stateStore: PluginStateStore) {
    super(
      {
        kind: 'action',
        timeoutMs: ACTION_EXECUTION_TIMEOUT_MS,
        toRegistered: (pluginId, action) => ({
          pluginId,
          name: action.name,
          description: action.description,
          action
        }),
        getExecutor: (registeredAction) => registeredAction.action.execute
      },
      pluginLogger,
      stateStore
    );
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

    this.registerDefinition(pluginId, action as ActionDefinition<unknown>);
  };
}

export { ActionRegistry };
