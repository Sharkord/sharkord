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
import { createServerViews } from './views/server-views';
import { createShellView } from './views/shell-view';

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
  const views = createServerViews(win, shellView);
  const performanceOverlay = createPerformanceOverlay(win);
  const userData = app.getPath('userData');

  const controller = createServerController(
    path.join(userData, 'servers.json'),
    views,
    (state) => {
      shellView.webContents.send(IpcChannel.STATE_CHANGED, state);
      Menu.setApplicationMenu(
        buildAppMenu({
          state,
          controller,
          win,
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
    shellContents: shellView.webContents
  });

  shellView.webContents.on('did-start-loading', () => {
    controller.setOverlay(false);
  });

  controller.sync();

  app.on('second-instance', () => {
    if (win.isMinimized()) {
      win.restore();
    }

    win.focus();
  });
};

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
  app.on('window-all-closed', () => app.quit());
} else {
  app.quit();
}
