import { useHotkeyState } from '@/hooks/use-hotkeys';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Group,
  SettingsSection,
  Switch
} from '@sharkord/ui';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

const DesktopSettings = memo(() => {
  const { t } = useTranslation('settings');
  const { capabilities } = useHotkeyState();

  return (
    <SettingsSection
      title={t('hotkeysDesktopTitle')}
      description={t('hotkeysDesktopDesc')}
    >
      <Group label={t('hotkeysEnableLabel')}>
        <Switch checked disabled />
      </Group>
      {capabilities.systemManaged && (
        <Alert variant="info">
          <AlertTitle>{t('hotkeysSystemManagedTitle')}</AlertTitle>
          <AlertDescription>{t('hotkeysSystemManagedDesc')}</AlertDescription>
        </Alert>
      )}
    </SettingsSection>
  );
});

export { DesktopSettings };
