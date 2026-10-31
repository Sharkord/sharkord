import { LanguageSwitcher } from '@/components/language-switcher';
import { useSettingsForm } from '@/components/server-screens/settings-shell/use-settings-form';
import {
  setAutoJoinLastChannel,
  setFreezeAnimatedAvatars
} from '@/features/app/actions';
import {
  useAutoJoinLastChannel,
  useFreezeAnimatedAvatars
} from '@/features/app/hooks';
import { Group, SettingsSection, Switch } from '@sharkord/ui';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

type TOthersValues = {
  autoJoinLastChannel: boolean;
  freezeAnimatedAvatars: boolean;
};

const Others = memo(() => {
  const { t } = useTranslation('settings');
  const autoJoinLastChannel = useAutoJoinLastChannel();
  const freezeAnimatedAvatars = useFreezeAnimatedAvatars();

  const onSave = useCallback(async (values: TOthersValues) => {
    setAutoJoinLastChannel(values.autoJoinLastChannel);
    setFreezeAnimatedAvatars(values.freezeAnimatedAvatars);
  }, []);

  const { values, onChange } = useSettingsForm<TOthersValues>({
    initialValues: { autoJoinLastChannel, freezeAnimatedAvatars },
    onSave,
    successMessage: t('othersUpdated'),
    errorMessage: t('failedUpdateOthers')
  });

  const handleAutoJoinChange = useCallback(
    (value: boolean) => onChange('autoJoinLastChannel', value),
    [onChange]
  );

  const handleFreezeAnimatedAvatarsChange = useCallback(
    (value: boolean) => onChange('freezeAnimatedAvatars', value),
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

      <Group
        label={t('freezeAnimatedAvatarsLabel')}
        description={t('freezeAnimatedAvatarsDesc')}
      >
        <Switch
          checked={values.freezeAnimatedAvatars}
          onCheckedChange={handleFreezeAnimatedAvatarsChange}
        />
      </Group>

      <Group label={t('languageLabel')} description={t('languageDesc')}>
        <LanguageSwitcher />
      </Group>
    </SettingsSection>
  );
});

export { Others };
