export enum LocalStorageKey {
  IDENTITY = 'sharkord-identity',
  REMEMBER_CREDENTIALS = 'sharkord-remember-identity',
  USER_PASSWORD = 'sharkord-user-password',
  SERVER_PASSWORD = 'sharkord-server-password',
  VITE_UI_THEME = 'vite-ui-theme',
  DEVICES_SETTINGS = 'sharkord-devices-settings',
  FLOATING_CARD_POSITION = 'sharkord-floating-card-position',
  RIGHT_SIDEBAR_STATE = 'sharkord-right-sidebar-state',
  VOICE_CHAT_SIDEBAR_STATE = 'sharkord-voice-chat-sidebar-state',
  VOICE_CHAT_SIDEBAR_WIDTH = 'sharkord-voice-chat-sidebar-width',
  VOICE_CHAT_SHOW_USER_BANNERS = 'sharkord-voice-chat-show-user-banners',
  VOLUME_SETTINGS = 'sharkord-volume-settings',
  RECENT_EMOJIS = 'sharkord-recent-emojis',
  PINNED_MESSAGES_SIDEBAR_STATE = 'sharkord-pinned-messages-sidebar-state',
  DEBUG = 'sharkord-debug',
  DRAFT_MESSAGES = 'sharkord-draft-messages',
  HIDE_NON_VIDEO_PARTICIPANTS = 'sharkord-hide-non-video-participants',
  THREAD_SIDEBAR_WIDTH = 'sharkord-thread-sidebar-width',
  LEFT_SIDEBAR_WIDTH = 'sharkord-left-sidebar-width',
  RIGHT_SIDEBAR_WIDTH = 'sharkord-right-sidebar-width',
  CATEGORIES_EXPANDED = 'sharkord-categories-expanded'
}

export enum SessionStorageKey {
  TOKEN = 'sharkord-token'
}

const getLocalStorageItem = (key: LocalStorageKey): string | null => {
  return localStorage.getItem(key);
};

const getLocalStorageItemBool = (
  key: LocalStorageKey,
  defaultValue: boolean = false
): boolean => {
  const item = localStorage.getItem(key);

  if (item === null) {
    return defaultValue ?? false;
  }

  return item === 'true';
};

const setLocalStorageItemBool = (
  key: LocalStorageKey,
  value: boolean
): void => {
  localStorage.setItem(key, value.toString());
};

const getLocalStorageItemAsJSON = <T>(
  key: LocalStorageKey,
  defaultValue: T | undefined = undefined
): T | undefined => {
  const item = localStorage.getItem(key);

  if (item) {
    return JSON.parse(item) as T;
  }

  return defaultValue;
};

const setLocalStorageItemAsJSON = <T>(key: LocalStorageKey, value: T): void => {
  localStorage.setItem(key, JSON.stringify(value));
};

const setLocalStorageItem = (key: LocalStorageKey, value: string): void => {
  localStorage.setItem(key, value);
};

const removeLocalStorageItem = (key: LocalStorageKey): void => {
  localStorage.removeItem(key);
};

const getSessionStorageItem = (key: SessionStorageKey): string | null => {
  return sessionStorage.getItem(key);
};

const setSessionStorageItem = (key: SessionStorageKey, value: string): void => {
  sessionStorage.setItem(key, value);
};

const removeSessionStorageItem = (key: SessionStorageKey): void => {
  sessionStorage.removeItem(key);
};

export {
  getLocalStorageItem,
  getLocalStorageItemAsJSON,
  getLocalStorageItemBool,
  getSessionStorageItem,
  removeLocalStorageItem,
  removeSessionStorageItem,
  setLocalStorageItem,
  setLocalStorageItemAsJSON,
  setLocalStorageItemBool,
  setSessionStorageItem
};
