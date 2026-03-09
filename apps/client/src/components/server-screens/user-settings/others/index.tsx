import { LanguageSwitcher } from '@/components/language-switcher';
import { setAutoJoinLastChannel } from '@/features/app/actions';
import { useAutoJoinLastChannel } from '@/features/app/hooks';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Group,
  Switch
} from '@sharkord/ui';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

const Others = memo(() => {
  const { t } = useTranslation('settings');
  const autoJoinLastChannel = useAutoJoinLastChannel();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('othersTitle')}</CardTitle>
        <CardDescription>{t('othersDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Group
          label={t('autoJoinLastChannelLabel')}
          description={t('autoJoinLastChannelDesc')}
        >
          <Switch
            checked={autoJoinLastChannel}
            onCheckedChange={(value) => setAutoJoinLastChannel(value)}
          />
        </Group>

        <Group label={t('languageLabel')} description={t('languageDesc')}>
          <LanguageSwitcher />
        </Group>
      </CardContent>
    </Card>
  );
});

export { Others };
