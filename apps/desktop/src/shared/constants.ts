const RAIL_WIDTH = 72;

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
  TOGGLE_MENU_BAR = 'window:toggle-menu-bar'
}

export { IpcChannel, RAIL_WIDTH };
