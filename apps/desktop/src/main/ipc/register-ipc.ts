import type { WebContents } from 'electron';
import { addServerCall, registerAddServer } from './add-server';
import {
  answerSourcePickCall,
  registerAnswerSourcePick
} from './answer-source-pick';
import {
  checkForUpdatesCall,
  registerCheckForUpdates
} from './check-for-updates';
import { downloadUpdateCall, registerDownloadUpdate } from './download-update';
import { getAppFolderCall, registerGetAppFolder } from './get-app-folder';
import { getRailVisibleCall, registerGetRailVisible } from './get-rail-visible';
import { getStateCall, registerGetState } from './get-state';
import { getUpdateStateCall, registerGetUpdateState } from './get-update-state';
import { installUpdateCall, registerInstallUpdate } from './install-update';
import { openAppFolderCall, registerOpenAppFolder } from './open-app-folder';
import { openSettingsCall, registerOpenSettings } from './open-settings';
import { registerRemoveServer, removeServerCall } from './remove-server';
import { registerRetryServer, retryServerCall } from './retry-server';
import { registerSelectServer, selectServerCall } from './select-server';
import { registerSetAdding, setAddingCall } from './set-adding';
import { registerSetOverlay, setOverlayCall } from './set-overlay';
import { registerSetRailHidden, setRailHiddenCall } from './set-rail-hidden';
import {
  registerSetSettingsOpen,
  setSettingsOpenCall
} from './set-settings-open';
import { registerToggleMenuBar, toggleMenuBarCall } from './toggle-menu-bar';
import {
  registerTogglePerformanceOverlay,
  togglePerformanceOverlayCall
} from './toggle-performance-overlay';
import { registerToggleRail, toggleRailCall } from './toggle-rail';
import type { TIpcContext } from './types';
import { registerUpdateSettings, updateSettingsCall } from './update-settings';

// the one list of ipc calls, the contract types and the registration both derive from it
const IPC_ROUTES = [
  [getStateCall, registerGetState],
  [addServerCall, registerAddServer],
  [selectServerCall, registerSelectServer],
  [retryServerCall, registerRetryServer],
  [removeServerCall, registerRemoveServer],
  [setAddingCall, registerSetAdding],
  [setOverlayCall, registerSetOverlay],
  [setRailHiddenCall, registerSetRailHidden],
  [getRailVisibleCall, registerGetRailVisible],
  [toggleRailCall, registerToggleRail],
  [setSettingsOpenCall, registerSetSettingsOpen],
  [updateSettingsCall, registerUpdateSettings],
  [openSettingsCall, registerOpenSettings],
  [togglePerformanceOverlayCall, registerTogglePerformanceOverlay],
  [toggleMenuBarCall, registerToggleMenuBar],
  [getUpdateStateCall, registerGetUpdateState],
  [checkForUpdatesCall, registerCheckForUpdates],
  [downloadUpdateCall, registerDownloadUpdate],
  [installUpdateCall, registerInstallUpdate],
  [getAppFolderCall, registerGetAppFolder],
  [openAppFolderCall, registerOpenAppFolder],
  [answerSourcePickCall, registerAnswerSourcePick]
] as const;

type TRegisterIpcOptions = Omit<TIpcContext, 'isShell'> & {
  shellContents: WebContents;
};

const registerIpc = ({ shellContents, ...rest }: TRegisterIpcOptions) => {
  const context: TIpcContext = {
    ...rest,
    isShell: (sender) => sender === shellContents
  };

  for (const [, register] of IPC_ROUTES) {
    register(context);
  }
};

export { IPC_ROUTES, registerIpc };
