import {
  setBrowserNotifications,
  setBrowserNotificationsForDms,
  setBrowserNotificationsForMentions
} from '@/features/app/actions';
import {
  useBrowserNotifications,
  useBrowserNotificationsForDms,
  useBrowserNotificationsForMentions
} from '@/features/app/hooks';
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

const Notifications = memo(() => {
  const { t } = useTranslation('settings');
  const browserNotifications = useBrowserNotifications();
  const browserNotificationsForMentions = useBrowserNotificationsForMentions();
  const browserNotificationsForDms = useBrowserNotificationsForDms();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('notificationsTitle')}</CardTitle>
        <CardDescription>{t('notificationsDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Group label={t('allMessagesLabel')} description={t('allMessagesDesc')}>
          <Switch
            checked={browserNotifications}
            onCheckedChange={(value) => setBrowserNotifications(value)}
          />
        </Group>
        <Group
          label={t('mentionsOnlyLabel')}
          description={t('mentionsOnlyDesc')}
        >
          <Switch
            checked={browserNotificationsForMentions}
            onCheckedChange={(value) =>
              setBrowserNotificationsForMentions(value)
            }
          />
        </Group>
        <Group
          label={t('dmNotificationsLabel')}
          description={t('dmNotificationsDesc')}
        >
          <Switch
            checked={browserNotificationsForDms}
            onCheckedChange={(value) => setBrowserNotificationsForDms(value)}
          />
        </Group>
      </CardContent>
    </Card>
  );
});

export { Notifications };
