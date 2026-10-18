import { Button, Group, SettingsSection, Switch } from '@sharkord/ui';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { TDesktopSettings } from '../../shared/types';
import { canToggleMenuBar } from '../platform';

type TGeneralSettingsProps = {
  settings: TDesktopSettings;
};

const GeneralSettings = memo(({ settings }: TGeneralSettingsProps) => {
  const { t } = useTranslation();

  const handleConnectAllChange = useCallback((checked: boolean) => {
    window.desktop.updateSettings({ connectAllOnStartup: checked });
  }, []);

  const handleThrottleChange = useCallback((checked: boolean) => {
    window.desktop.updateSettings({ throttleHiddenServers: checked });
  }, []);

  const handleTogglePerformanceOverlay = useCallback(() => {
    window.desktop.togglePerformanceOverlay();
  }, []);

  const handleToggleMenuBar = useCallback(() => {
    window.desktop.toggleMenuBar();
  }, []);

  return (
    <>
      <SettingsSection title={t('settings.general')}>
        <Group
          label={t('settings.connectAllOnStartup')}
          description={t('settings.connectAllOnStartupDescription')}
        >
          <Switch
            checked={settings.connectAllOnStartup}
            onCheckedChange={handleConnectAllChange}
          />
        </Group>
        {canToggleMenuBar && (
          <Group
            label={t('settings.menuBar')}
            description={t('settings.menuBarDescription')}
          >
            <Button
              variant="outline"
              className="w-fit"
              onClick={handleToggleMenuBar}
            >
              {t('menu.toggleMenuBar')}
            </Button>
          </Group>
        )}
      </SettingsSection>
      <SettingsSection title={t('settings.performance')}>
        <Group
          label={t('settings.throttleHiddenServers')}
          description={t('settings.throttleHiddenServersDescription')}
        >
          <Switch
            checked={settings.throttleHiddenServers}
            onCheckedChange={handleThrottleChange}
          />
        </Group>
        <Group
          label={t('settings.performanceOverlay')}
          description={t('settings.performanceOverlayDescription')}
        >
          <Button
            variant="outline"
            className="w-fit"
            onClick={handleTogglePerformanceOverlay}
          >
            {t('settings.togglePerformanceOverlay')}
          </Button>
        </Group>
      </SettingsSection>
    </>
  );
});

export { GeneralSettings };
