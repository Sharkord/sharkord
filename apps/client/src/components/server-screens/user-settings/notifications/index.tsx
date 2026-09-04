import { SettingsSection } from '@/components/server-screens/settings-shell/section';
import { useSettingsForm } from '@/components/server-screens/settings-shell/use-settings-form';
import {
  setBrowserNotifications,
  setBrowserNotificationsForDms,
  setBrowserNotificationsForMentions,
  setBrowserNotificationsForReplies
} from '@/features/app/actions';
import {
  useBrowserNotifications,
  useBrowserNotificationsForDms,
  useBrowserNotificationsForMentions,
  useBrowserNotificationsForReplies
} from '@/features/app/hooks';
import { Group, Switch } from '@sharkord/ui';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

type TNotificationsValues = {
  all: boolean;
  mentions: boolean;
  dms: boolean;
  replies: boolean;
};

const Notifications = memo(() => {
  const { t } = useTranslation('settings');
  const all = useBrowserNotifications();
  const mentions = useBrowserNotificationsForMentions();
  const dms = useBrowserNotificationsForDms();
  const replies = useBrowserNotificationsForReplies();

  const onSave = useCallback(async (values: TNotificationsValues) => {
    // TODO: refactor this later
    setBrowserNotifications(values.all);
    setBrowserNotificationsForMentions(values.mentions);
    setBrowserNotificationsForDms(values.dms);
    setBrowserNotificationsForReplies(values.replies);
  }, []);

  const { values, onChange } = useSettingsForm<TNotificationsValues>({
    initialValues: { all, mentions, dms, replies },
    onSave,
    successMessage: t('notificationsUpdated'),
    errorMessage: t('failedUpdateNotifications')
  });

  const handleAllChange = useCallback(
    (value: boolean) => onChange('all', value),
    [onChange]
  );
  const handleMentionsChange = useCallback(
    (value: boolean) => onChange('mentions', value),
    [onChange]
  );
  const handleDmsChange = useCallback(
    (value: boolean) => onChange('dms', value),
    [onChange]
  );
  const handleRepliesChange = useCallback(
    (value: boolean) => onChange('replies', value),
    [onChange]
  );

  return (
    <SettingsSection
      title={t('notificationsTitle')}
      description={t('notificationsDesc')}
    >
      <Group label={t('allMessagesLabel')} description={t('allMessagesDesc')}>
        <Switch checked={values.all} onCheckedChange={handleAllChange} />
      </Group>
      <Group label={t('mentionsOnlyLabel')} description={t('mentionsOnlyDesc')}>
        <Switch
          checked={values.mentions}
          onCheckedChange={handleMentionsChange}
        />
      </Group>
      <Group
        label={t('dmNotificationsLabel')}
        description={t('dmNotificationsDesc')}
      >
        <Switch checked={values.dms} onCheckedChange={handleDmsChange} />
      </Group>
      <Group
        label={t('repliesNotificationsLabel')}
        description={t('repliesNotificationsDesc')}
      >
        <Switch
          checked={values.replies}
          onCheckedChange={handleRepliesChange}
        />
      </Group>
    </SettingsSection>
  );
});

export { Notifications };
