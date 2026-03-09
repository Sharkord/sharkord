import { SUPPORTED_LANGUAGES } from '@/i18n';
import type { Locale } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

export const useDateLocale = (): Locale => {
  const { i18n } = useTranslation();
  return (
    SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language)?.dateLocale ??
    enUS
  );
};
