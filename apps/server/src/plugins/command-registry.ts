import type {
  CommandDefinition,
  RegisteredCommand,
  TCommandsMapByPlugin,
  TInvokerContext
} from '@sharkord/shared';
import type { PluginLogger } from './plugin-logger';
import type { PluginStateStore } from './plugin-state-store';

class CommandRegistry {
  private pluginLogger: PluginLogger;
  private stateStore: PluginStateStore;
  private commands = new Map<string, RegisteredCommand[]>();

  constructor(pluginLogger: PluginLogger, stateStore: PluginStateStore) {
    this.pluginLogger = pluginLogger;
    this.stateStore = stateStore;
  }

  public register = <TArgs = void>(
    pluginId: string,
    command: CommandDefinition<TArgs>
  ) => {
    if (!this.commands.has(pluginId)) {
      this.commands.set(pluginId, []);
    }

    const pluginCommands = this.commands.get(pluginId)!;

    const existingIndex = pluginCommands.findIndex(
      (c) => c.name === command.name
    );

    if (existingIndex !== -1) {
      this.pluginLogger.log(
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

    this.pluginLogger.log(
      pluginId,
      'debug',
      `Registered command: ${command.name}${command.description ? ` - ${command.description}` : ''}`
    );
  };

  public unload = (pluginId: string) => {
    const pluginCommands = this.commands.get(pluginId);

    if (!pluginCommands || pluginCommands.length === 0) {
      return;
    }

    const commandNames = pluginCommands.map((c) => c.name);

    this.commands.delete(pluginId);

    this.pluginLogger.log(
      pluginId,
      'debug',
      `Unregistered ${commandNames.length} command(s): ${commandNames.join(', ')}`
    );
  };

  public execute = async <TArgs = unknown>(
    pluginId: string,
    commandName: string,
    invokerCtx: TInvokerContext,
    args: TArgs
  ): Promise<unknown> => {
    if (!this.stateStore.isEnabled(pluginId)) {
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
      this.pluginLogger.log(
        pluginId,
        'debug',
        `Executing command '${commandName}' with args:`,
        args
      );

      return await foundCommand.command.execute(invokerCtx, args);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.pluginLogger.log(
        pluginId,
        'error',
        `Error executing command '${commandName}': ${errorMessage}`
      );

      throw error;
    }
  };

  public getAll = (): TCommandsMapByPlugin => {
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

  public getByName = (
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

  public has = (pluginId: string, commandName: string): boolean => {
    const commands = this.commands.get(pluginId);

    if (!commands) {
      return false;
    }

    return commands.some((c) => c.name === commandName);
  };
}

export { CommandRegistry };
