export const SUPPORTED_LOCALES = [
  'en',
  'cs',
  'es',
  'fr',
  'it',
  'ru',
  'zh',
  'pt-BR'
];

export type TLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: TLocale = 'en';
