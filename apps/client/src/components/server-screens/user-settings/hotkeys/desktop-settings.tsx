import { Group, SettingsSection, Switch } from '@sharkord/ui';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { THotkeysOnChange, THotkeysValues } from './types';

type TDesktopSettingsProps = {
  values: THotkeysValues;
  onChange: THotkeysOnChange;
};

const DesktopSettings = memo(({ values, onChange }: TDesktopSettingsProps) => {
  const { t } = useTranslation('settings');

  const handleEnabledChange = useCallback(
    (enabled: boolean) => onChange('enabled', enabled),
    [onChange]
  );

  return (
    <SettingsSection
      title={t('hotkeysDesktopTitle')}
      description={t('hotkeysDesktopDesc')}
    >
      <Group label={t('hotkeysEnableLabel')}>
        <Switch
          checked={values.enabled}
          onCheckedChange={handleEnabledChange}
        />
      </Group>
    </SettingsSection>
  );
});

export { DesktopSettings };
