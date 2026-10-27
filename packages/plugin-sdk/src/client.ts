import type {
  TContractActions,
  TContractCommands,
  TContractPush,
  TContractUserData,
  TPluginActions,
  TPluginComponentsMapBySlotId,
  TPluginContract,
  TPluginHotkeyAction,
  TPluginHotkeyBinding,
  TPluginHotkeyPhase,
  TPluginMessageComponentProps,
  TPluginMessageComponentsMap,
  TPluginNotification,
  TPluginStore,
  TPluginStoreState,
  TPluginTabs,
  TPluginUserData
} from '@sharkord/shared';
// deep import: the barrel is tree shakeable now that the package declares
// itself side effect free, and this does not rely on the bundler honouring it
import { PluginCapabilityType } from '@sharkord/shared/src/plugins/capabilities';
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
 * Whether the user may run one of this plugin's actions, so the UI can disable
 * a button rather than let the call fail. Pass the contract to autocomplete the
 * name.
 *
 * UX only: the server checks again on every call, and it is the answer that
 * counts.
 */
const useCanUseAction = <C extends TPluginContract = TPluginContract>(
  name: keyof TContractActions<C> & string
) => store.hooks.useCanUse(PluginCapabilityType.ACTION, name);

/**
 * The same for a slash command, for UI that lists or offers them. The command
 * is refused server side either way.
 */
const useCanUseCommand = <C extends TPluginContract = TPluginContract>(
  name: keyof TContractCommands<C> & string
) => store.hooks.useCanUse(PluginCapabilityType.COMMAND, name);

/**
 * The audio output the user picked in their device settings, for
 * `audio.setSinkId()`, so what you play comes out where the call does.
 * `undefined` means the system default: leave the sink alone then. The device
 * can be unplugged since it was picked, so catch a failing `setSinkId`.
 */
const usePlaybackDeviceId = () => store.hooks.usePlaybackDeviceId();

/**
 * Registers an action the user can bind a key to, in Sharkord's Hotkeys
 * settings or with a `HotkeyInput` from `@sharkord/ui`. Keys work while the game or another app has
 * focus, when the user runs the Sharkord Bridge. The action exists while the
 * component using the hook is mounted, so a soundboard calls it once per sound.
 *
 * ```ts
 * useHotkey({ id: `play-${sound.id}`, label: sound.name }, () => play(sound));
 * ```
 *
 * `mode: 'hold'` also reports the release (`phase === 'up'`).
 */
const useHotkey = (
  action: TPluginHotkeyAction,
  handler: (phase: TPluginHotkeyPhase) => void
) => store.hooks.useHotkey(action, handler);

/**
 * Everything one of your actions needs to be bound: the key as the user should
 * read it (`display`, `undefined` while unbound) and the props of the
 * `HotkeyInput` from `@sharkord/ui`, so a control to record the key is one line.
 * It records, refuses keys the browser or OS keep and keys another action
 * already uses, and applies as soon as the user picks.
 *
 * ```tsx
 * const binding = useHotkeyBinding(id);
 *
 * return <HotkeyInput {...binding} />;
 * ```
 */
const useHotkeyBinding = (id: string): TPluginHotkeyBinding =>
  store.hooks.useHotkeyBinding(id);

/**
 * Returns a function that shows a system notification from your plugin: a
 * browser notification on the web, a native one in the desktop app.
 *
 * ```ts
 * const notify = useNotify();
 *
 * notify({
 *   title: 'Build finished',
 *   body: 'main passed in 4 minutes',
 *   icon: 'data:image/png;base64,...',
 *   data: { buildId: 42 }
 * });
 * ```
 *
 * The title is shown after your plugin's name. `icon` is an http(s) address,
 * for example one of your own routes, or a `data:image/...` url for an image
 * you generated. `blob:` urls are not supported. `data` comes back to
 * `useNotificationClick`, keep it small: it is capped at 4 KB.
 *
 * Nothing shows, without an error, when the user has not turned on plugin
 * notifications, when none of their roles may receive this plugin's
 * notifications, or when the plugin sent more than 5 in 5 seconds.
 */
const useNotify = (): ((notification: TPluginNotification) => void) =>
  store.hooks.useNotify();

/**
 * Runs when the user clicks one of your notifications, with the `data` you
 * sent it. The window is already in front by then.
 *
 * ```ts
 * useNotificationClick((data) => openBuild((data as { buildId: number }).buildId));
 * ```
 */
const useNotificationClick = (handler: (data: unknown) => void) =>
  store.hooks.useNotificationClick(handler);

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
  useCanUseAction,
  useCanUseCommand,
  useHotkey,
  useHotkeyBinding,
  useNotificationClick,
  useNotify,
  usePlaybackDeviceId,
  usePush,
  useStoreSelector,
  useUserData
};
export type {
  TPluginComponentsMapBySlotId,
  TPluginHotkeyAction,
  TPluginHotkeyBinding,
  TPluginHotkeyPhase,
  TPluginMessageComponentProps,
  TPluginMessageComponentsMap,
  TPluginNotification,
  TPluginStoreState,
  TPluginTabs
};
