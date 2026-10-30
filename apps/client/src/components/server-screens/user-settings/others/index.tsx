import { LanguageSwitcher } from '@/components/language-switcher';
import { SettingsSection } from '@/components/server-screens/settings-shell/section';
import { useSettingsForm } from '@/components/server-screens/settings-shell/use-settings-form';
import { setAutoJoinLastChannel } from '@/features/app/actions';
import { useAutoJoinLastChannel } from '@/features/app/hooks';
import { Group, Switch } from '@sharkord/ui';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

type TOthersValues = {
  autoJoinLastChannel: boolean;
};

const Others = memo(() => {
  const { t } = useTranslation('settings');
  const autoJoinLastChannel = useAutoJoinLastChannel();

  const onSave = useCallback(async (values: TOthersValues) => {
    setAutoJoinLastChannel(values.autoJoinLastChannel);
  }, []);

  const { values, onChange } = useSettingsForm<TOthersValues>({
    initialValues: { autoJoinLastChannel },
    onSave,
    successMessage: t('othersUpdated'),
    errorMessage: t('failedUpdateOthers')
  });

  const handleAutoJoinChange = useCallback(
    (value: boolean) => onChange('autoJoinLastChannel', value),
    [onChange]
  );

  return (
    <SettingsSection title={t('othersTitle')} description={t('othersDesc')}>
      <Group
        label={t('autoJoinLastChannelLabel')}
        description={t('autoJoinLastChannelDesc')}
      >
        <Switch
          checked={values.autoJoinLastChannel}
          onCheckedChange={handleAutoJoinChange}
        />
      </Group>

      <Group label={t('languageLabel')} description={t('languageDesc')}>
        <LanguageSwitcher />
      </Group>
    </SettingsSection>
  );
});

export { Others };
