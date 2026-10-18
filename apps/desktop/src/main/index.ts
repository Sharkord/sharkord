import { app, BrowserWindow, Menu } from 'electron';
import path from 'path';
import icon from '../../build/icon.png?asset';
import { IpcChannel } from '../shared/constants';
import type { TServer } from '../shared/types';
import { createPerformanceOverlay } from './dev/performance-overlay';
import { confirmAndResetApp, wipeUserDataIfRequested } from './dev/reset-app';
import { initI18n } from './i18n';
import { registerIpc } from './ipc/register-ipc';
import { buildAppMenu } from './menu/app-menu';
import { confirmRemoveServer } from './servers/confirm-remove-server';
import { createServerController } from './servers/server-controller';
import { disableBackgroundThrottling } from './startup/disable-background-throttling';
import { enableChromiumFeatures } from './startup/enable-chromium-features';
import { createTray, type TAppTray } from './tray/create-tray';
import { createServerViews } from './views/server-views';
import { createShellView } from './views/shell-view';

// kept at module level so the tray is not garbage collected
let tray: TAppTray | undefined;
let isQuitting = false;

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 500,
    backgroundColor: '#1a1a1a',
    icon
  });

  win.setMenuBarVisibility(false);

  return win;
};

const start = () => {
  const win = createWindow();
  const shellView = createShellView();
  const views = createServerViews(win, shellView, () => controller.notify());
  const performanceOverlay = createPerformanceOverlay(win);
  const userData = app.getPath('userData');

  const controller = createServerController(
    path.join(userData, 'servers.json'),
    views,
    (state) => {
      shellView.webContents.send(IpcChannel.STATE_CHANGED, state);
      tray?.setUnread(state.unread);
      Menu.setApplicationMenu(
        buildAppMenu({
          state,
          controller,
          win,
          requestRemove,
          togglePerformanceOverlay: performanceOverlay.toggle,
          isBackgroundThrottled: views.isBackgroundThrottled(),
          setBackgroundThrottled: views.setBackgroundThrottled,
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
    shellContents: shellView.webContents
  });

  shellView.webContents.on('did-start-loading', () => {
    controller.setOverlay(false);
  });

  controller.sync();

  const showWindow = () => {
    if (win.isMinimized()) {
      win.restore();
    }

    win.show();
    win.focus();
  };

  // macos keeps its own dock behaviour, the other platforms hide to the tray on close
  if (process.platform !== 'darwin') {
    tray = createTray(icon, showWindow);

    win.on('close', (event) => {
      if (isQuitting) {
        return;
      }

      event.preventDefault();
      win.hide();
    });
  }

  app.on('second-instance', showWindow);
};

enableChromiumFeatures();
disableBackgroundThrottling();
wipeUserDataIfRequested();

const hasLock = app.requestSingleInstanceLock();

if (hasLock) {
  app.on('ready', async () => {
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
  app.on('window-all-closed', () => app.quit());
} else {
  app.quit();
}
