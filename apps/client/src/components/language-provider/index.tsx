import { i18n } from '@/i18n';
import { I18nextProvider } from 'react-i18next';
import { memo, type PropsWithChildren } from 'react';

const LanguageProvider = memo(({ children }: PropsWithChildren) => {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
});

export { LanguageProvider };
