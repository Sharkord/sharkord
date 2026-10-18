import {
  Menu,
  type BrowserWindow,
  type MenuItemConstructorOptions
} from 'electron';
import type { TServer, TServersState } from '../../shared/types';
import { i18n } from '../i18n';
import type { TServerController } from '../servers/server-controller';

const MAX_SHORTCUT_SERVERS = 9;

type TAppMenuOptions = {
  state: TServersState;
  controller: TServerController;
  win: BrowserWindow;
  requestRemove: (server: TServer) => Promise<void>;
  togglePerformanceOverlay: () => void;
  isBackgroundThrottled: boolean;
  setBackgroundThrottled: (value: boolean) => void;
  resetApp: () => Promise<void>;
};

const buildServersMenu = ({
  state,
  controller,
  win,
  requestRemove
}: TAppMenuOptions): MenuItemConstructorOptions => {
  const { servers, selectedId, adding, railVisible } = state;
  const current = servers.find((server) => server.id === selectedId);

  const serverItems: MenuItemConstructorOptions[] = servers.map(
    (server, index) => ({
      label: server.name,
      type: 'radio',
      checked: server.id === selectedId && !adding,
      accelerator:
        index < MAX_SHORTCUT_SERVERS ? `CmdOrCtrl+${index + 1}` : undefined,
      click: () => controller.select(server.id)
    })
  );

  const isMac = process.platform === 'darwin';

  return {
    label: i18n.t('menu.servers'),
    submenu: [
      {
        label: i18n.t('menu.addServer'),
        accelerator: 'CmdOrCtrl+Shift+N',
        click: () => controller.setAdding(true)
      },
      { type: 'separator' },
      ...serverItems,
      { type: 'separator' },
      {
        label: railVisible
          ? i18n.t('menu.hideServerList')
          : i18n.t('menu.showServerList'),
        accelerator: 'CmdOrCtrl+B',
        enabled: servers.length > 0,
        click: () => controller.toggleRail()
      },
      {
        label: i18n.t('menu.removeCurrentServer'),
        enabled: current !== undefined,
        click: () => {
          if (current) {
            requestRemove(current);
          }
        }
      },
      { type: 'separator' },
      {
        label: i18n.t('menu.toggleMenuBar'),
        accelerator: 'CmdOrCtrl+Shift+M',
        // the macos menu bar belongs to the system and cannot be hidden
        enabled: !isMac,
        click: () => win.setMenuBarVisibility(!win.isMenuBarVisible())
      },
      { type: 'separator' },
      isMac ? { role: 'close' } : { role: 'quit' }
    ]
  };
};

const buildDevMenu = ({
  togglePerformanceOverlay,
  isBackgroundThrottled,
  setBackgroundThrottled,
  resetApp
}: TAppMenuOptions): MenuItemConstructorOptions => ({
  label: 'Dev',
  submenu: [
    {
      label: 'Toggle Performance Overlay',
      accelerator: 'CmdOrCtrl+Shift+D',
      click: togglePerformanceOverlay
    },
    {
      label: 'Throttle Hidden Server Views',
      type: 'checkbox',
      checked: isBackgroundThrottled,
      click: (item) => setBackgroundThrottled(item.checked)
    },
    { type: 'separator' },
    {
      label: 'Reset App...',
      click: resetApp
    }
  ]
});

const buildAppMenu = (options: TAppMenuOptions) => {
  const template: MenuItemConstructorOptions[] = [
    buildServersMenu(options),
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' }
  ];

  template.push(buildDevMenu(options));

  if (process.platform === 'darwin') {
    template.unshift({ role: 'appMenu' });
  }

  return Menu.buildFromTemplate(template);
};

export { buildAppMenu };
