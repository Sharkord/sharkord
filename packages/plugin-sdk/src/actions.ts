import type {
  TActionContract,
  TContractActions,
  TPluginActions,
  TPluginContract
} from '@sharkord/shared';
// deep import: the '@sharkord/shared' barrel pulls zod into every client bundle
import { getPluginIdFromBundleUrl } from '@sharkord/shared/src/plugins/client-sdk';

type TypedCallAction<TActions extends TActionContract> = <
  K extends keyof TActions & string
>(
  name: K,
  ...args: TActions[K]['payload'] extends void
    ? []
    : [payload: TActions[K]['payload']]
) => Promise<TActions[K]['response']>;

const getOwnPluginId = (): string => {
  const pluginId = getPluginIdFromBundleUrl(import.meta.url);

  if (!pluginId) {
    throw new Error(
      'createCallAction can only be used from plugin client code served by Sharkord.'
    );
  }

  return pluginId;
};

const createCallAction = <C extends TPluginContract>(
  actions: TPluginActions
) => {
  const pluginId = getOwnPluginId();

  const callAction: TypedCallAction<TContractActions<C>> = (name, ...args) => {
    const payload = args[0];

    return actions.executePluginAction(pluginId, name, payload) as Promise<
      TContractActions<C>[typeof name]['response']
    >;
  };

  return callAction;
};

export { createCallAction };
export type { TActionContract, TypedCallAction };
