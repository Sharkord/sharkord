import { Menu, type MenuItemConstructorOptions } from 'electron';
import { getServerShortcut, SHORTCUTS } from '../../shared/shortcuts';
import type { TServer, TServersState } from '../../shared/types';
import { openAppFolder } from '../app-folder/open-app-folder';
import { i18n } from '../i18n';
import type { TServerController } from '../servers/server-controller';

type TAppMenuOptions = {
  state: TServersState;
  controller: TServerController;
  toggleMenuBar: () => void;
  requestRemove: (server: TServer) => Promise<void>;
  togglePerformanceOverlay: () => void;
  resetApp: () => Promise<void>;
};

const buildServersMenu = ({
  state,
  controller,
  toggleMenuBar,
  requestRemove
}: TAppMenuOptions): MenuItemConstructorOptions => {
  const { servers, selectedId, adding, railVisible, railLocked } = state;
  const current = servers.find((server) => server.id === selectedId);

  const serverItems: MenuItemConstructorOptions[] = servers.map(
    (server, index) => ({
      label: server.name,
      type: 'radio',
      checked: server.id === selectedId && !adding,
      accelerator: getServerShortcut(index),
      click: () => controller.select(server.id)
    })
  );

  const isMac = process.platform === 'darwin';

  return {
    label: i18n.t('menu.servers'),
    submenu: [
      {
        label: i18n.t('menu.addServer'),
        accelerator: SHORTCUTS.addServer,
        click: () => controller.setAdding(true)
      },
      { type: 'separator' },
      ...serverItems,
      { type: 'separator' },
      {
        label: railVisible
          ? i18n.t('menu.hideServerList')
          : i18n.t('menu.showServerList'),
        accelerator: SHORTCUTS.toggleServerList,
        enabled: servers.length > 0 && !railLocked,
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
        accelerator: SHORTCUTS.toggleMenuBar,
        // the macos menu bar belongs to the system and cannot be hidden
        enabled: !isMac,
        click: toggleMenuBar
      },
      { type: 'separator' },
      isMac ? { role: 'close' } : { role: 'quit' }
    ]
  };
};

const buildAdvancedMenu = ({
  controller,
  togglePerformanceOverlay,
  resetApp
}: TAppMenuOptions): MenuItemConstructorOptions => ({
  label: i18n.t('menu.advanced'),
  submenu: [
    {
      label: i18n.t('menu.desktopSettings'),
      click: () => controller.setSettingsOpen(true)
    },
    { type: 'separator' },
    {
      label: i18n.t('menu.togglePerformanceOverlay'),
      accelerator: SHORTCUTS.togglePerformanceOverlay,
      click: togglePerformanceOverlay
    },
    {
      label: i18n.t('menu.openAppFolder'),
      click: openAppFolder
    },
    { type: 'separator' },
    {
      label: i18n.t('menu.resetApp'),
      click: resetApp
    }
  ]
});

const getAppMenuKey = ({
  servers,
  selectedId,
  adding,
  railVisible,
  railLocked
}: TServersState) =>
  JSON.stringify({
    servers: servers.map(({ id, name }) => [id, name]),
    selectedId,
    adding,
    railVisible,
    railLocked
  });

const buildAppMenu = (options: TAppMenuOptions) => {
  const template: MenuItemConstructorOptions[] = [
    buildServersMenu(options),
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' }
  ];

  template.push(buildAdvancedMenu(options));

  if (process.platform === 'darwin') {
    template.unshift({ role: 'appMenu' });
  }

  return Menu.buildFromTemplate(template);
};

export { buildAppMenu, getAppMenuKey };
