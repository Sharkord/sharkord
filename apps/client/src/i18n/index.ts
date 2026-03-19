import { getLocalStorageItem, LocalStorageKey } from '@/helpers/storage';
import type { Locale } from 'date-fns';
import { enUS, fr, zhCN } from 'date-fns/locale';
import i18n from 'i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import { initReactI18next } from 'react-i18next';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', dateLocale: enUS },
  { code: 'fr', label: 'Français', dateLocale: fr },
  { code: 'zh', label: '中文', dateLocale: zhCN }
] satisfies Array<{ code: string; label: string; dateLocale: Locale }>;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]['code'];

const savedLanguage = getLocalStorageItem(LocalStorageKey.LANGUAGE);

const detectBrowserLanguage = (): SupportedLanguage => {
  try {
    const browserLangs = navigator.languages ?? [navigator.language];

    for (const lang of browserLangs) {
      const code = lang.split('-')[0];

      if (SUPPORTED_LANGUAGES.some((l) => l.code === code)) {
        return code as SupportedLanguage;
      }
    }
  } catch {
    // ignore
  }

  return 'en';
};

const isSavedLanguageValid =
  savedLanguage && SUPPORTED_LANGUAGES.some((l) => l.code === savedLanguage);

const initialLanguage: SupportedLanguage = isSavedLanguageValid
  ? savedLanguage
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
      'settings',
      'permissions'
    ],
    defaultNS: 'common',
    fallbackNS: 'common',
    interpolation: {
      escapeValue: false
    }
  });

i18n.on('languageChanged', (lng) => {
  localStorage.setItem(LocalStorageKey.LANGUAGE, lng);
});
