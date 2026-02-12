import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import {
  DEFAULT_LANGUAGE,
  resolveInitialLanguage,
  setLanguage,
  type TAppLanguage
} from '@/helpers/language';
import { resources } from './resources';

const resourcesByDefaultNamespace = Object.fromEntries(
  Object.entries(resources).map(([language, dictionary]) => {
    const { common = {}, ...rest } = dictionary;

    return [
      language,
      {
        common: {
          ...common,
          ...rest
        }
      }
    ];
  })
);

void i18n.use(initReactI18next).init({
  resources: resourcesByDefaultNamespace,
  lng: resolveInitialLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  defaultNS: 'common',
  interpolation: {
    escapeValue: false
  }
});

const applyDocumentLanguage = (language: string): void => {
  document.documentElement.lang = language;
};

applyDocumentLanguage(i18n.resolvedLanguage || DEFAULT_LANGUAGE);

i18n.on('languageChanged', (language) => {
  setLanguage(language as TAppLanguage);
  applyDocumentLanguage(language);
});

export { i18n };
