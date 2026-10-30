import { SettingsSection } from '@/components/server-screens/settings-shell/section';
import { useSettingsForm } from '@/components/server-screens/settings-shell/use-settings-form';
import { useAdminChannelGeneral } from '@/features/server/admin/hooks';
import { getTRPCClient } from '@/lib/trpc';
import { Group, Input, LoadingCard, Switch, Textarea } from '@sharkord/ui';
import { memo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

type TGeneralProps = {
  channelId: number;
};

type TChannelValues = {
  name: string;
  topic: string;
  private: boolean;
};

const General = memo(({ channelId }: TGeneralProps) => {
  const { t } = useTranslation('settings');
  const { channel, loading } = useAdminChannelGeneral(channelId);

  const onSave = useCallback(
    async (values: TChannelValues) => {
      const trpc = getTRPCClient();

      await trpc.channels.update.mutate({
        channelId,
        name: values.name,
        topic: values.topic || null,
        private: values.private
      });
    },
    [channelId]
  );

  const { r, values, onChange, reset } = useSettingsForm<TChannelValues>({
    initialValues: { name: '', topic: '', private: false },
    onSave,
    successMessage: t('channelUpdated'),
    errorMessage: t('failedUpdateChannel')
  });

  useEffect(() => {
    if (!channel) return;

    reset({
      name: channel.name,
      topic: channel.topic ?? '',
      private: channel.private
    });
  }, [channel, reset]);

  const handlePrivateChange = useCallback(
    (value: boolean) => onChange('private', value),
    [onChange]
  );

  if (loading) {
    return <LoadingCard className="h-64" />;
  }

  return (
    <SettingsSection
      title={t('channelInfoTitle')}
      description={t('channelInfoDesc')}
    >
      <Group label={t('channelNameLabel')}>
        <Input placeholder={t('channelNamePlaceholder')} {...r('name')} />
      </Group>

      <Group label={t('channelTopicLabel')}>
        <Textarea placeholder={t('channelTopicPlaceholder')} {...r('topic')} />
      </Group>

      <Group label={t('privateLabel')} description={t('privateDesc')}>
        <Switch
          checked={values.private}
          onCheckedChange={handlePrivateChange}
        />
      </Group>
    </SettingsSection>
  );
});

export { General };
