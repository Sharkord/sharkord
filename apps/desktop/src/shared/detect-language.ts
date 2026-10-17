import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  type TLocale
} from '@sharkord/shared';

const getLanguage = (locale: string) => {
  const [language] = locale.toLowerCase().split('-');

  return language;
};

const detectLanguage = (candidates: readonly string[]): TLocale => {
  for (const candidate of candidates) {
    const exact = SUPPORTED_LOCALES.find(
      (locale) => locale.toLowerCase() === candidate.toLowerCase()
    );

    if (exact) {
      return exact;
    }

    const candidateLanguage = getLanguage(candidate);

    const sameLanguage = SUPPORTED_LOCALES.find(
      (locale) => getLanguage(locale) === candidateLanguage
    );

    if (sameLanguage) {
      return sameLanguage;
    }
  }

  return DEFAULT_LOCALE;
};

export { detectLanguage };
