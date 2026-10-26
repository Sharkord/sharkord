import { app, BrowserWindow, globalShortcut, Menu } from 'electron';
import path from 'path';
import icon from '../../build/icon.png?asset';
import { APP_ID, IpcChannel } from '../shared/constants';
import type { TServer } from '../shared/types';
import { getAppFolder, openAppFolder } from './app-folder/open-app-folder';
import { findDeepLink, parseDeepLink } from './deep-links/parse-deep-link';
import { registerProtocol } from './deep-links/register-protocol';
import { createPerformanceOverlay } from './dev/performance-overlay';
import { confirmAndResetApp, wipeUserDataIfRequested } from './dev/reset-app';
import { setActiveHotkeyServer } from './hotkeys/global-hotkeys';
import { initI18n } from './i18n';
import { registerIpc } from './ipc/register-ipc';
import { buildAppMenu } from './menu/app-menu';
import { confirmRemoveServer } from './servers/confirm-remove-server';
import { createServerController } from './servers/server-controller';
import { disableBackgroundThrottling } from './startup/disable-background-throttling';
import { enableChromiumFeatures } from './startup/enable-chromium-features';
import { setAutoStart } from './startup/set-auto-start';
import { writeDesktopEntry } from './startup/write-desktop-entry';
import { createTray, type TAppTray } from './tray/create-tray';
import {
  checkForUpdates,
  downloadUpdate,
  getUpdateState,
  installUpdate,
  onUpdateStateChange,
  setAutoUpdateEnabled,
  startAutoUpdater
} from './updater/auto-updater';
import { createServerViews } from './views/server-views';
import { createShellView } from './views/shell-view';

const hasTray = process.platform !== 'darwin';

// kept at module level so the tray is not garbage collected
let tray: TAppTray | undefined;
let isQuitting = false;

let handleDeepLink: ((link: string) => void) | undefined;
let pendingDeepLink = findDeepLink(process.argv);

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 500,
    backgroundColor: '#1a1a1a',
    title: 'Sharkord',
    icon,
    show: false
  });

  win.setMenuBarVisibility(false);

  return win;
};

const start = () => {
  const win = createWindow();
  const shellView = createShellView();

  const views = createServerViews(
    win,
    shellView,
    () => controller.notify(),
    (serverId) => {
      showWindow();
      controller.select(serverId);
    }
  );

  const performanceOverlay = createPerformanceOverlay(win);

  const toggleMenuBar = () => {
    win.setMenuBarVisibility(!win.isMenuBarVisible());
  };

  const userData = app.getPath('userData');

  let appliedAutoStart: boolean | undefined;
  let appliedAutoUpdate: boolean | undefined;

  const controller = createServerController(
    path.join(userData, 'servers.json'),
    views,
    (state) => {
      shellView.webContents.send(IpcChannel.STATE_CHANGED, state);

      tray?.setUnread(state.unread);
      setActiveHotkeyServer(state.selectedId);

      if (state.settings.autoStart !== appliedAutoStart) {
        appliedAutoStart = state.settings.autoStart;

        setAutoStart(appliedAutoStart);
      }

      if (state.settings.autoUpdate !== appliedAutoUpdate) {
        appliedAutoUpdate = state.settings.autoUpdate;

        setAutoUpdateEnabled(appliedAutoUpdate);
      }

      Menu.setApplicationMenu(
        buildAppMenu({
          state,
          controller,
          toggleMenuBar,
          requestRemove,
          togglePerformanceOverlay: performanceOverlay.toggle,
          resetApp: () => confirmAndResetApp(win, controller)
        })
      );
    }
  );

  const requestRemove = (server: TServer) =>
    confirmRemoveServer(win, controller, server);

  registerIpc({
    controller,
    requestRemove,
    togglePerformanceOverlay: performanceOverlay.toggle,
    toggleMenuBar,
    getAppFolder,
    openAppFolder,
    updater: {
      getState: getUpdateState,
      check: checkForUpdates,
      download: downloadUpdate,
      install: installUpdate
    },
    shellContents: shellView.webContents
  });

  onUpdateStateChange((state) => {
    shellView.webContents.send(IpcChannel.UPDATE_STATE_CHANGED, state);
  });

  shellView.webContents.on('did-start-loading', () => {
    controller.setOverlay(false);
  });

  controller.sync();

  const { settings } = controller.getState();

  if (!hasTray || !settings.startToTray) {
    win.show();
  }

  if (settings.connectAllOnStartup) {
    controller.loadAll();
  }

  const showWindow = () => {
    if (win.isMinimized()) {
      win.restore();
    }

    win.show();
    win.focus();
  };

  startAutoUpdater({
    onOpenUpdates: () => {
      showWindow();

      controller.setSettingsOpen(true, 'updates');
    }
  });

  if (hasTray) {
    tray = createTray(icon, showWindow);

    win.on('close', (event) => {
      if (isQuitting) {
        return;
      }

      event.preventDefault();
      win.hide();
    });
  }

  handleDeepLink = (link) => {
    const deepLink = parseDeepLink(link);

    if (!deepLink) {
      return;
    }

    showWindow();
    controller.openAddServer(deepLink.serverUrl);
  };

  if (pendingDeepLink) {
    handleDeepLink(pendingDeepLink);

    pendingDeepLink = undefined;
  }

  app.on('second-instance', (_event, argv) => {
    showWindow();

    const link = findDeepLink(argv);

    if (link && handleDeepLink) {
      handleDeepLink(link);
    }
  });
};

enableChromiumFeatures();
disableBackgroundThrottling();
wipeUserDataIfRequested();
writeDesktopEntry(icon);

const hasLock = app.requestSingleInstanceLock();

if (hasLock) {
  registerProtocol();

  // macos delivers links through this event, also before the app is ready
  app.on('open-url', (event, link) => {
    event.preventDefault();

    if (handleDeepLink) {
      handleDeepLink(link);

      return;
    }

    pendingDeepLink = link;
  });

  app.on('ready', async () => {
    if (process.platform === 'win32') {
      app.setAppUserModelId(APP_ID);
    }

    // a packaged mac app gets its icon from the bundle, this covers dev runs
    if (process.platform === 'darwin') {
      app.dock?.setIcon(icon);
    }

    await initI18n();

    start();
  });

  app.on('before-quit', () => {
    isQuitting = true;
    tray?.destroy();
  });

  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
  });

  app.on('window-all-closed', () => app.quit());
} else {
  app.quit();
}
