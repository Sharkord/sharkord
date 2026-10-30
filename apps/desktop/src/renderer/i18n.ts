import i18n from 'i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import { initReactI18next } from 'react-i18next';
import { detectLanguage } from '../shared/detect-language';

const i18nReady = i18n
  .use(initReactI18next)
  .use(
    resourcesToBackend(
      (language: string, namespace: string) =>
        import(`../i18n/locales/${language}/${namespace}.json`)
    )
  )
  .init({
    lng: detectLanguage(navigator.languages),
    fallbackLng: 'en',
    ns: ['common'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false
    }
  });

export { i18n, i18nReady };
