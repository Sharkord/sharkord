import type {
  TActionContract,
  TInvokerContext,
  TPluginActions
} from '@sharkord/shared';
import type { PluginContext } from '.';

type TypedRegisterAction<TActions extends TActionContract> = <
  K extends keyof TActions & string
>(
  name: K,
  handler: (
    invoker: TInvokerContext,
    payload: TActions[K]['payload']
  ) => Promise<TActions[K]['response']>
) => void;

type TypedCallAction<TActions extends TActionContract> = <
  K extends keyof TActions & string
>(
  name: K,
  ...args: TActions[K]['payload'] extends void
    ? []
    : [payload: TActions[K]['payload']]
) => Promise<TActions[K]['response']>;

const createRegisterAction = <TActions extends TActionContract>(
  ctx: PluginContext
) => {
  const registerAction: TypedRegisterAction<TActions> = (name, handler) => {
    ctx.actions.register({
      name,
      async execute(invokerCtx, payload) {
        return handler(invokerCtx, payload as never);
      }
    });
  };

  return registerAction;
};

const createCallAction = <TActions extends TActionContract>(
  actions: TPluginActions
) => {
  const callAction: TypedCallAction<TActions> = (name, ...args) => {
    const payload = args[0];
    return actions.executePluginAction(name, payload) as Promise<
      TActions[typeof name]['response']
    >;
  };

  return callAction;
};

export { createCallAction, createRegisterAction };
export type { TActionContract, TypedCallAction, TypedRegisterAction };
