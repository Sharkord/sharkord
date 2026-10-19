import { app } from 'electron';
import i18next from 'i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import { detectLanguage } from '../shared/detect-language';

const i18n = i18next.createInstance();

const initI18n = () =>
  i18n
    .use(
      resourcesToBackend(
        (language: string, namespace: string) =>
          import(`../i18n/locales/${language}/${namespace}.json`)
      )
    )
    .init({
      lng: detectLanguage([app.getLocale()]),
      fallbackLng: 'en',
      ns: ['common'],
      defaultNS: 'common',
      interpolation: {
        escapeValue: false
      }
    });

export { i18n, initI18n };
