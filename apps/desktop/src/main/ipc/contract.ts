import type { z } from 'zod';
import type { addServerCall } from './add-server';
import type { checkForUpdatesCall } from './check-for-updates';
import type { downloadUpdateCall } from './download-update';
import type { getAppFolderCall } from './get-app-folder';
import type { getRailVisibleCall } from './get-rail-visible';
import type { getStateCall } from './get-state';
import type { getUpdateStateCall } from './get-update-state';
import type { installUpdateCall } from './install-update';
import type { openAppFolderCall } from './open-app-folder';
import type { openSettingsCall } from './open-settings';
import type { removeServerCall } from './remove-server';
import type { selectServerCall } from './select-server';
import type { setAddingCall } from './set-adding';
import type { setOverlayCall } from './set-overlay';
import type { setRailHiddenCall } from './set-rail-hidden';
import type { setSettingsOpenCall } from './set-settings-open';
import type { toggleMenuBarCall } from './toggle-menu-bar';
import type { togglePerformanceOverlayCall } from './toggle-performance-overlay';
import type { toggleRailCall } from './toggle-rail';
import type { updateSettingsCall } from './update-settings';

type TIpcCalls =
  | typeof getStateCall
  | typeof addServerCall
  | typeof selectServerCall
  | typeof removeServerCall
  | typeof setAddingCall
  | typeof setOverlayCall
  | typeof setRailHiddenCall
  | typeof getRailVisibleCall
  | typeof toggleRailCall
  | typeof setSettingsOpenCall
  | typeof updateSettingsCall
  | typeof openSettingsCall
  | typeof togglePerformanceOverlayCall
  | typeof toggleMenuBarCall
  | typeof getUpdateStateCall
  | typeof checkForUpdatesCall
  | typeof downloadUpdateCall
  | typeof installUpdateCall
  | typeof getAppFolderCall
  | typeof openAppFolderCall;

type TIpcChannel = TIpcCalls['channel'];
type TIpcCallOf<C extends TIpcChannel> = Extract<TIpcCalls, { channel: C }>;
type TIpcArgs<C extends TIpcChannel> = z.input<TIpcCallOf<C>['args']>;
type TIpcResult<C extends TIpcChannel> = z.output<TIpcCallOf<C>['result']>;

export type { TIpcArgs, TIpcChannel, TIpcResult };
