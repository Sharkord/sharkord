import { LanguageSwitcher } from '@/components/language-switcher';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Group
} from '@sharkord/ui';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { DateFormatSettings } from '../others/date-format-settings';

const Interface = memo(() => {
  const { t } = useTranslation('settings');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('interfaceTitle')}</CardTitle>
        <CardDescription>{t('interfaceDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Group label={t('languageLabel')} description={t('languageDesc')}>
          <LanguageSwitcher />
        </Group>
        <DateFormatSettings />
      </CardContent>
    </Card>
  );
});

Interface.displayName = 'Interface';

export { Interface };
