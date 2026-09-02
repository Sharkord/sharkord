import type {
  TActionContract,
  TPluginActions,
  TPluginComponentsMapBySlotId,
  TPluginStore,
  TPluginStoreState,
  TPluginTabs
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
 * Calls your own server actions, typed by the contract your server half
 * exports:
 *
 * ```ts
 * const callAction = createCallAction<Actions>();
 * ```
 *
 * Call it once at module scope, not inside a component.
 */
const createCallAction = <TActions extends TActionContract>() =>
  bindCallAction<TActions>(actions);

/** Receives whatever your server sent through `ctx.push`. */
const usePush = store.hooks.usePush;

/** Per-user storage for this plugin, the client half of `ctx.userData`. */
const useUserData = store.hooks.useUserData;

/**
 * Reads a slice of Sharkord's state and re-renders when it changes.
 *
 * The selector must return a stable reference for unchanged state: reading a
 * field (`(state) => state.users`) is fine, building a new array or object on
 * every call is not. Memoize those with `createSelector` from reselect.
 */
const useStoreSelector = <T>(selector: (state: TPluginStoreState) => T): T =>
  useSyncExternalStore(store.subscribe, () => selector(store.getState()));

export {
  actions,
  createCallAction,
  usePush,
  useStoreSelector,
  useUserData
};
export type {
  TPluginComponentsMapBySlotId,
  TPluginStoreState,
  TPluginTabs
};
