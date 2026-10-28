enum BridgeChannel {
  CLIENT_CONNECTED = 'client:connected',
  CLIENT_MISMATCH = 'client:mismatch',
  GET_RAIL_VISIBLE = 'rail:get-visible',
  TOGGLE_RAIL = 'rail:toggle',
  OPEN_SETTINGS = 'settings:open',
  RAIL_VISIBLE_CHANGED = 'rail:visible-changed',
  SET_UNREAD = 'unread:set',
  SET_CONNECTION_STATE = 'connection:set',
  SET_VOICE_ACTIVE = 'voice:set-active',
  START_SYSTEM_AUDIO = 'system-audio:start',
  STOP_SYSTEM_AUDIO = 'system-audio:stop',
  SHOW_NOTIFICATION = 'notification:show',
  SET_HOTKEYS = 'hotkeys:set',
  GET_HOTKEY_CAPABILITIES = 'hotkeys:get-capabilities',
  HOTKEY_PRESSED = 'hotkeys:pressed',
  HOTKEY_ERRORS = 'hotkeys:errors',
  NOTIFICATION_CLICKED = 'notification:clicked'
}

export { BridgeChannel };
