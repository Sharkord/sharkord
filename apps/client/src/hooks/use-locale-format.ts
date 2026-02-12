import { enUS, it, type Locale } from 'date-fns/locale';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

type TFormatDateOptions = Intl.DateTimeFormatOptions;

const getDateFnsLocale = (language: string): Locale => {
  if (language.startsWith('it')) {
    return it;
  }

  return enUS;
};

const getIntlLanguage = (language: string): string => {
  if (language.startsWith('it')) {
    return 'it-IT';
  }

  return 'en-US';
};

const useLocaleFormat = () => {
  const { i18n } = useTranslation();

  const language = i18n.resolvedLanguage || i18n.language || 'en';

  const intlLanguage = useMemo(() => {
    return getIntlLanguage(language);
  }, [language]);

  const dateFnsLocale = useMemo(() => {
    return getDateFnsLocale(language);
  }, [language]);

  const formatDate = (date: Date, options?: TFormatDateOptions): string => {
    return new Intl.DateTimeFormat(intlLanguage, {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      ...options
    }).format(date);
  };

  const formatDateTime = (date: Date, options?: TFormatDateOptions): string => {
    return new Intl.DateTimeFormat(intlLanguage, {
      dateStyle: 'medium',
      timeStyle: 'medium',
      ...options
    }).format(date);
  };

  const formatTime = (date: Date, options?: TFormatDateOptions): string => {
    return new Intl.DateTimeFormat(intlLanguage, {
      timeStyle: 'medium',
      ...options
    }).format(date);
  };

  return {
    language,
    intlLanguage,
    dateFnsLocale,
    formatDate,
    formatDateTime,
    formatTime
  };
};

export { useLocaleFormat };
