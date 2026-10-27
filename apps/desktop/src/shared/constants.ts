const RAIL_WIDTH = 72;

const APP_ID = 'com.sharkord.desktop';

enum IpcChannel {
  GET_STATE = 'servers:get-state',
  STATE_CHANGED = 'servers:state-changed',
  ADD_SERVER = 'servers:add',
  REMOVE_SERVER = 'servers:remove',
  SET_OVERLAY = 'servers:set-overlay',
  SELECT_SERVER = 'servers:select',
  RETRY_SERVER = 'servers:retry',
  SET_ADDING = 'servers:set-adding',
  SET_RAIL_HIDDEN = 'servers:set-rail-hidden',
  SET_SETTINGS_OPEN = 'settings:set-open',
  UPDATE_SETTINGS = 'settings:update',
  TOGGLE_PERFORMANCE_OVERLAY = 'advanced:toggle-performance-overlay',
  TOGGLE_MENU_BAR = 'window:toggle-menu-bar',
  GET_UPDATE_STATE = 'updates:get-state',
  UPDATE_STATE_CHANGED = 'updates:state-changed',
  CHECK_FOR_UPDATES = 'updates:check',
  DOWNLOAD_UPDATE = 'updates:download',
  INSTALL_UPDATE = 'updates:install',
  GET_APP_FOLDER = 'app-folder:get',
  OPEN_APP_FOLDER = 'app-folder:open',
  SOURCE_PICK_REQUESTED = 'screen-share:pick-requested',
  ANSWER_SOURCE_PICK = 'screen-share:answer-pick'
}

export { APP_ID, IpcChannel, RAIL_WIDTH };
