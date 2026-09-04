export enum LocalStorageKey {
  IDENTITY = 'sharkord-identity',
  VITE_UI_THEME = 'vite-ui-theme',
  DEVICES_SETTINGS = 'sharkord-devices-settings',
  FLOATING_CARD_POSITION = 'sharkord-floating-card-position',
  RIGHT_SIDEBAR_STATE = 'sharkord-right-sidebar-state',
  VOICE_CHAT_SIDEBAR_STATE = 'sharkord-voice-chat-sidebar-state',
  VOICE_CHAT_SIDEBAR_CHANNEL_ID = 'sharkord-voice-chat-sidebar-channel-id',
  VOICE_CHAT_SIDEBAR_WIDTH = 'sharkord-voice-chat-sidebar-width',
  VOICE_CHAT_SHOW_USER_BANNERS = 'sharkord-voice-chat-show-user-banners',
  VOLUME_SETTINGS = 'sharkord-volume-settings',
  STREAM_QUALITY_SETTINGS = 'sharkord-stream-quality-settings',
  RECENT_EMOJIS = 'sharkord-recent-emojis',
  DEBUG = 'sharkord-debug',
  DRAFT_MESSAGES = 'sharkord-draft-messages',
  HIDE_NON_VIDEO_PARTICIPANTS = 'sharkord-hide-non-video-participants',
  THREAD_SIDEBAR_WIDTH = 'sharkord-thread-sidebar-width',
  LEFT_SIDEBAR_WIDTH = 'sharkord-left-sidebar-width',
  RIGHT_SIDEBAR_WIDTH = 'sharkord-right-sidebar-width',
  CATEGORIES_EXPANDED = 'sharkord-categories-expanded',
  AUTO_LOGIN = 'sharkord-auto-login',
  AUTO_LOGIN_TOKEN = 'sharkord-auto-login-token',
  LAST_SELECTED_CHANNEL = 'sharkord-last-selected-channel',
  AUTO_JOIN_LAST_CHANNEL = 'sharkord-auto-join-last-channel',
  BROWSER_NOTIFICATIONS = 'sharkord-browser-notifications',
  BROWSER_NOTIFICATIONS_FOR_MENTIONS = 'sharkord-browser-notifications-for-mentions',
  BROWSER_NOTIFICATIONS_FOR_DMS = 'sharkord-browser-notifications-for-dms',
  CHAT_INPUT_HEIGHT_VH = 'sharkord-chat-input-height-vh',
  THREAD_INPUT_HEIGHT_VH = 'sharkord-thread-input-height-vh',
  BROWSER_NOTIFICATIONS_FOR_REPLIES = 'sharkord-browser-notifications-for-replies',
  LANGUAGE = 'sharkord-language',
  PLUGIN_SLOT_DEBUG = 'sharkord-plugin-slot-debug',
  HIDE_OWN_SCREEN_SHARE = 'sharkord-hide-own-screen-share',
  ALWAYS_SHOW_VOICE_CONTROLS = 'sharkord-always-show-voice-controls'
}

export enum SessionStorageKey {
  TOKEN = 'sharkord-token',
  OIDC_NO_AUTO_REDIRECT = 'sharkord-oidc-no-auto-redirect'
}

// librewolf and firefox private mode throw SecurityError when privacy hardening
// blocks storage access, so every read/write has to survive the storage being gone
const readItem = (kind: 'local' | 'session', key: string): string | null => {
  try {
    const storage = kind === 'local' ? localStorage : sessionStorage;

    return storage.getItem(key);
  } catch {
    return null;
  }
};

const writeItem = (kind: 'local' | 'session', key: string, value: string) => {
  try {
    const storage = kind === 'local' ? localStorage : sessionStorage;

    storage.setItem(key, value);
  } catch {
    // storage is unavailable, the value just does not persist
  }
};

const deleteItem = (kind: 'local' | 'session', key: string) => {
  try {
    const storage = kind === 'local' ? localStorage : sessionStorage;

    storage.removeItem(key);
  } catch {
    // storage is unavailable, nothing to remove
  }
};

const getLocalStorageItem = (key: LocalStorageKey): string | null => {
  return readItem('local', key);
};

const getLocalStorageItemBool = (
  key: LocalStorageKey,
  defaultValue: boolean = false
): boolean => {
  const item = readItem('local', key);

  if (item === null) {
    return defaultValue ?? false;
  }

  return item === 'true';
};

const setLocalStorageItemBool = (
  key: LocalStorageKey,
  value: boolean
): void => {
  writeItem('local', key, value.toString());
};

const getLocalStorageItemAsNumber = (
  key: LocalStorageKey,
  defaultValue?: number
): number | undefined => {
  const item = readItem('local', key);

  if (item === null) {
    return defaultValue;
  }

  const parsed = parseInt(item, 10);

  return Number.isNaN(parsed) ? defaultValue : parsed;
};

const getLocalStorageItemAsJSON = <T>(
  key: LocalStorageKey,
  defaultValue: T | undefined = undefined
): T | undefined => {
  const item = readItem('local', key);

  if (item) {
    try {
      return JSON.parse(item) as T;
    } catch {
      return defaultValue;
    }
  }

  return defaultValue;
};

const setLocalStorageItemAsJSON = <T>(key: LocalStorageKey, value: T): void => {
  writeItem('local', key, JSON.stringify(value));
};

const setLocalStorageItem = (key: LocalStorageKey, value: string): void => {
  writeItem('local', key, value);
};

const removeLocalStorageItem = (key: LocalStorageKey): void => {
  deleteItem('local', key);
};

const getSessionStorageItem = (key: SessionStorageKey): string | null => {
  return readItem('session', key);
};

const setSessionStorageItem = (key: SessionStorageKey, value: string): void => {
  writeItem('session', key, value);
};

const removeSessionStorageItem = (key: SessionStorageKey): void => {
  deleteItem('session', key);
};

export {
  getLocalStorageItem,
  getLocalStorageItemAsJSON,
  getLocalStorageItemAsNumber,
  getLocalStorageItemBool,
  getSessionStorageItem,
  removeLocalStorageItem,
  removeSessionStorageItem,
  setLocalStorageItem,
  setLocalStorageItemAsJSON,
  setLocalStorageItemBool,
  setSessionStorageItem
};
