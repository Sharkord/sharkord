const RAIL_WIDTH = 72;

// also written as appId in electron-builder.yml and as desktopName (plus .desktop) in package.json,
// which cannot import it. windows toasts and linux portals know the app by this id
const APP_ID = 'com.sharkord.desktop';

enum IpcChannel {
  GET_STATE = 'servers:get-state',
  STATE_CHANGED = 'servers:state-changed',
  ADD_SERVER = 'servers:add',
  REMOVE_SERVER = 'servers:remove',
  SET_OVERLAY = 'servers:set-overlay',
  SELECT_SERVER = 'servers:select',
  SET_ADDING = 'servers:set-adding',
  SET_RAIL_HIDDEN = 'servers:set-rail-hidden',
  SET_SETTINGS_OPEN = 'settings:set-open',
  UPDATE_SETTINGS = 'settings:update',
  TOGGLE_PERFORMANCE_OVERLAY = 'dev:toggle-performance-overlay',
  TOGGLE_MENU_BAR = 'window:toggle-menu-bar',
  GET_UPDATE_STATE = 'updates:get-state',
  UPDATE_STATE_CHANGED = 'updates:state-changed',
  CHECK_FOR_UPDATES = 'updates:check',
  DOWNLOAD_UPDATE = 'updates:download',
  INSTALL_UPDATE = 'updates:install',
  GET_APP_FOLDER = 'app-folder:get',
  OPEN_APP_FOLDER = 'app-folder:open'
}

export { APP_ID, IpcChannel, RAIL_WIDTH };
