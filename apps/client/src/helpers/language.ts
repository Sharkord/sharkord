import {
  getLocalStorageItem,
  LocalStorageKey,
  setLocalStorageItem
} from './storage';

const APP_LANGUAGES = ['en', 'it'] as const;

type TAppLanguage = (typeof APP_LANGUAGES)[number];

const DEFAULT_LANGUAGE: TAppLanguage = 'en';

const isAppLanguage = (value: string): value is TAppLanguage => {
  return APP_LANGUAGES.includes(value as TAppLanguage);
};

const getLanguage = (): TAppLanguage | undefined => {
  const value = getLocalStorageItem(LocalStorageKey.UI_LANGUAGE);

  if (!value) {
    return undefined;
  }

  if (isAppLanguage(value)) {
    return value;
  }

  return undefined;
};

const setLanguage = (language: TAppLanguage): void => {
  setLocalStorageItem(LocalStorageKey.UI_LANGUAGE, language);
};

const resolveInitialLanguage = (): TAppLanguage => {
  const fromStorage = getLanguage();

  if (fromStorage) {
    return fromStorage;
  }

  if (typeof navigator !== 'undefined') {
    const [browserLanguage] = navigator.language.toLowerCase().split('-');

    if (browserLanguage && isAppLanguage(browserLanguage)) {
      return browserLanguage;
    }
  }

  return DEFAULT_LANGUAGE;
};

export {
  APP_LANGUAGES,
  DEFAULT_LANGUAGE,
  getLanguage,
  isAppLanguage,
  resolveInitialLanguage,
  setLanguage
};
export type { TAppLanguage };
