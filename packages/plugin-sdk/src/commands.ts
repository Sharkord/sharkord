import type {
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
      async execute(invokerCtx, args) {
        return handler(invokerCtx, args as never);
      }
    });
  };

  return registerCommand;
};

export { createRegisterCommand };
export type { TypedRegisterCommand };
