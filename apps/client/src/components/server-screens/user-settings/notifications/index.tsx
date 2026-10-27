import { useSettingsForm } from '@/components/server-screens/settings-shell/use-settings-form';
import {
  setMessageSentSound,
  setNotificationSounds,
  setNotifyAllMessages,
  setNotifyDms,
  setNotifyMentionsOnly,
  setNotifyPlugins,
  setNotifyReplies
} from '@/features/app/actions';
import {
  useMessageSentSound,
  useNotificationSounds,
  useNotifyAllMessages,
  useNotifyDms,
  useNotifyMentionsOnly,
  useNotifyPlugins,
  useNotifyReplies
} from '@/features/app/hooks';
import { assertNotificationsPermission } from '@/helpers/assert-notifications-permission';
import { notify } from '@/lib/notifications';
import { Button, Group, SettingsSection, Switch } from '@sharkord/ui';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

type TNotificationsValues = {
  all: boolean;
  mentions: boolean;
  dms: boolean;
  replies: boolean;
  plugins: boolean;
  sounds: boolean;
  sentSound: boolean;
};

const Notifications = memo(() => {
  const { t } = useTranslation('settings');
  const all = useNotifyAllMessages();
  const mentions = useNotifyMentionsOnly();
  const dms = useNotifyDms();
  const replies = useNotifyReplies();
  const plugins = useNotifyPlugins();
  const sounds = useNotificationSounds();
  const sentSound = useMessageSentSound();

  const onSave = useCallback(async (values: TNotificationsValues) => {
    // TODO: refactor this later
    setNotifyAllMessages(values.all);
    setNotifyMentionsOnly(values.mentions);
    setNotifyDms(values.dms);
    setNotifyReplies(values.replies);
    setNotifyPlugins(values.plugins);
    setNotificationSounds(values.sounds);
    setMessageSentSound(values.sentSound);
  }, []);

  const { values, onChange } = useSettingsForm<TNotificationsValues>({
    initialValues: { all, mentions, dms, replies, plugins, sounds, sentSound },
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
  const handlePluginsChange = useCallback(
    (value: boolean) => onChange('plugins', value),
    [onChange]
  );
  const handleSoundsChange = useCallback(
    (value: boolean) => onChange('sounds', value),
    [onChange]
  );
  const handleSentSoundChange = useCallback(
    (value: boolean) => onChange('sentSound', value),
    [onChange]
  );

  const handleSendTest = useCallback(async () => {
    const granted = await assertNotificationsPermission();

    if (!granted) {
      return;
    }

    notify({
      title: t('testNotificationTitle'),
      body: t('testNotificationBody')
    });
  }, [t]);

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
      <Group
        label={t('pluginNotificationsLabel')}
        description={t('pluginNotificationsDesc')}
      >
        <Switch
          checked={values.plugins}
          onCheckedChange={handlePluginsChange}
        />
      </Group>
      <Group label={t('soundsLabel')} description={t('soundsDesc')}>
        <Switch checked={values.sounds} onCheckedChange={handleSoundsChange} />
      </Group>
      <Group
        label={t('messageSentSoundLabel')}
        description={t('messageSentSoundDesc')}
      >
        <Switch
          checked={values.sentSound}
          disabled={!values.sounds}
          onCheckedChange={handleSentSoundChange}
        />
      </Group>
      <Group
        label={t('testNotificationLabel')}
        description={t('testNotificationDesc')}
      >
        <Button variant="outline" className="w-fit" onClick={handleSendTest}>
          {t('sendTestNotification')}
        </Button>
      </Group>
    </SettingsSection>
  );
});

export { Notifications };
