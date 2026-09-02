import type {
  TContractPush,
  TContractUserData,
  TPluginActions,
  TPluginComponentsMapBySlotId,
  TPluginContract,
  TPluginStore,
  TPluginStoreState,
  TPluginTabs,
  TPluginUserData
} from '@sharkord/shared';
import { useSyncExternalStore } from 'react';
import { createCallAction as bindCallAction } from './actions';

declare global {
  interface Window {
    /** the host store, exposed before any plugin bundle is imported */
    __SHARKORD_STORE__: TPluginStore;
  }
}

const store = window.__SHARKORD_STORE__;

/**
 * Sharkord's own actions: sending a message, selecting a channel, fetching one
 * of your HTTP routes. To call your own server actions use `createCallAction`.
 */
const actions: TPluginActions = store.actions;

/**
 * Calls your own server actions, typed by the `TPluginContract` both halves of
 * the plugin share:
 *
 * ```ts
 * const callAction = createCallAction<TSharkord>();
 * ```
 *
 * Call it once at module scope, not inside a component.
 */
const createCallAction = <C extends TPluginContract>() =>
  bindCallAction<C>(actions);

/**
 * Receives whatever your server sent through `ctx.push`. Pass the contract to
 * type the payload, or nothing to receive it as `unknown`.
 */
const usePush = <C extends TPluginContract = TPluginContract>(
  handler: (data: TContractPush<C>) => void
) => store.hooks.usePush(handler as (data: unknown) => void);

/**
 * Per-user storage for this plugin, the client half of `ctx.userData`. Pass the
 * contract to type what `data` holds and what `save` accepts.
 */
const useUserData = <C extends TPluginContract = TPluginContract>() =>
  store.hooks.useUserData() as TPluginUserData<TContractUserData<C>>;

/**
 * Reads a slice of Sharkord's state and re-renders when it changes.
 *
 * The selector must return a stable reference for unchanged state: reading a
 * field (`(state) => state.users`) is fine, building a new array or object on
 * every call is not. Memoize those with `createSelector` from reselect.
 */
const useStoreSelector = <T>(selector: (state: TPluginStoreState) => T): T =>
  useSyncExternalStore(store.subscribe, () => selector(store.getState()));

export { actions, createCallAction, usePush, useStoreSelector, useUserData };
export type { TPluginComponentsMapBySlotId, TPluginStoreState, TPluginTabs };
