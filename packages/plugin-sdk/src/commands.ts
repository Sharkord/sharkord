import type {
  Permission,
  TCommandArg,
  TCommandContract,
  TInvokerContext
} from '@sharkord/shared';
import type { PluginContext } from '.';

type TypedRegisterCommand<TCommands extends TCommandContract> = <
  K extends keyof TCommands & string
>(
  name: K,
  options: {
    description?: string;
    args?: TCommandArg[];
    /**
     * The permission a user needs to run this command. Without it the command
     * is public; either way a server owner can override the access per role.
     */
    requires?: Permission;
  },
  handler: (
    invoker: TInvokerContext,
    args: TCommands[K]['args']
  ) => Promise<TCommands[K]['response']>
) => void;

const createRegisterCommand = <TCommands extends TCommandContract>(
  ctx: PluginContext
) => {
  const registerCommand: TypedRegisterCommand<TCommands> = (
    name,
    options,
    handler
  ) => {
    ctx.commands.register({
      name,
      description: options.description,
      args: options.args,
      requires: options.requires,
      async execute(invokerCtx, args) {
        return handler(invokerCtx, args as never);
      }
    });
  };

  return registerCommand;
};

export { createRegisterCommand };
export type { TypedRegisterCommand };
