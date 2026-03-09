import type { Locale } from 'date-fns';
import { enUS, zhCN } from 'date-fns/locale';
import i18n from 'i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import { initReactI18next } from 'react-i18next';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', dateLocale: enUS },
  { code: 'zh', label: '中文', dateLocale: zhCN }
] satisfies Array<{ code: string; label: string; dateLocale: Locale }>;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]['code'];

const LANGUAGE_STORAGE_KEY = 'sharkord_language';

const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);

const detectBrowserLanguage = (): SupportedLanguage => {
  const browserLangs = navigator.languages ?? [navigator.language];
  for (const lang of browserLangs) {
    const code = lang.split('-')[0];
    if (SUPPORTED_LANGUAGES.some((l) => l.code === code)) {
      return code as SupportedLanguage;
    }
  }
  return 'en';
};

const initialLanguage: SupportedLanguage =
  savedLanguage && SUPPORTED_LANGUAGES.some((l) => l.code === savedLanguage)
    ? (savedLanguage as SupportedLanguage)
    : detectBrowserLanguage();

export const i18nReady = i18n
  .use(initReactI18next)
  .use(
    resourcesToBackend(
      (language: string, namespace: string) =>
        import(`./locales/${language}/${namespace}.json`)
    )
  )
  .init({
    lng: initialLanguage,
    fallbackLng: 'en',
    ns: [
      'common',
      'connect',
      'disconnected',
      'sidebar',
      'topbar',
      'dialogs',
      'settings'
    ],
    defaultNS: 'common',
    fallbackNS: 'common',
    interpolation: {
      escapeValue: false
    }
  });

i18n.on('languageChanged', (lng) => {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
});

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof import('./locales/en/common.json');
      connect: typeof import('./locales/en/connect.json');
      disconnected: typeof import('./locales/en/disconnected.json');
      sidebar: typeof import('./locales/en/sidebar.json');
      topbar: typeof import('./locales/en/topbar.json');
      dialogs: typeof import('./locales/en/dialogs.json');
      settings: typeof import('./locales/en/settings.json');
    };
  }
}
