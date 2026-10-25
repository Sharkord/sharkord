enum BridgeChannel {
  CLIENT_CONNECTED = 'client:connected',
  CLIENT_MISMATCH = 'client:mismatch',
  GET_RAIL_VISIBLE = 'rail:get-visible',
  TOGGLE_RAIL = 'rail:toggle',
  OPEN_SETTINGS = 'settings:open',
  RAIL_VISIBLE_CHANGED = 'rail:visible-changed',
  SET_UNREAD = 'unread:set',
  SET_CONNECTION_STATE = 'connection:set',
  START_SYSTEM_AUDIO = 'system-audio:start',
  STOP_SYSTEM_AUDIO = 'system-audio:stop',
  SHOW_NOTIFICATION = 'notification:show',
  SET_HOTKEYS = 'hotkeys:set',
  HOTKEY_PRESSED = 'hotkeys:pressed',
  NOTIFICATION_CLICKED = 'notification:clicked',
  CONFIRM_REQUEST = 'confirm:request',
  CONFIRM_RESPONSE = 'confirm:response'
}

export { BridgeChannel };
