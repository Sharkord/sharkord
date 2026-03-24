import type {
  CommandDefinition,
  RegisteredCommand,
  TCommandsMapByPlugin
} from '@sharkord/shared';
import { COMMAND_EXECUTION_TIMEOUT_MS } from './execution-timeout';
import { PluginExecutableRegistry } from './plugin-executable-registry';
import type { PluginLogger } from './plugin-logger';
import type { PluginStateStore } from './plugin-state-store';

class CommandRegistry extends PluginExecutableRegistry<
  CommandDefinition<unknown>,
  RegisteredCommand
> {
  constructor(pluginLogger: PluginLogger, stateStore: PluginStateStore) {
    super(
      {
        kind: 'command',
        timeoutMs: COMMAND_EXECUTION_TIMEOUT_MS,
        toRegistered: (pluginId, command) => ({
          pluginId,
          name: command.name,
          description: command.description,
          args: command.args,
          command
        }),
        getExecutor: (registeredCommand) => registeredCommand.command.execute
      },
      pluginLogger,
      stateStore
    );
  }

  public register = <TArgs = void>(
    pluginId: string,
    command: CommandDefinition<TArgs>
  ) => {
    this.registerDefinition(pluginId, command as CommandDefinition<unknown>);
  };

  public getAll = (): TCommandsMapByPlugin => {
    const allCommands: TCommandsMapByPlugin = {};
    const definitionsEntries = this.getDefinitions().entries();

    for (const [pluginId, commands] of definitionsEntries) {
      allCommands[pluginId] = commands.map(({ name, description, args }) => ({
        pluginId,
        name,
        description,
        args
      }));
    }

    return allCommands;
  };

  public getByName = (
    commandName: string | undefined
  ): RegisteredCommand | undefined => {
    if (!commandName) {
      return undefined;
    }

    const definitionsValues = this.getDefinitions().values();

    for (const commands of definitionsValues) {
      const foundCommand = commands.find((c) => c.name === commandName);

      if (foundCommand) {
        return foundCommand;
      }
    }

    return undefined;
  };
}

export { CommandRegistry };
