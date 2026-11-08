import { Button, Group, SettingsSection, Slider, Switch } from '@sharkord/ui';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TDesktopSettings } from '../../shared/types';
import { canToggleMenuBar, hasTray, isLinux, isWindows } from '../platform';
import { FolderSettings } from './folder-settings';

type TGeneralSettingsProps = {
  settings: TDesktopSettings;
};

const GeneralSettings = memo(({ settings }: TGeneralSettingsProps) => {
  const { t } = useTranslation();

  const handleConnectAllChange = useCallback((checked: boolean) => {
    window.desktop.updateSettings({ connectAllOnStartup: checked });
  }, []);

  const handleAutoStartChange = useCallback((checked: boolean) => {
    window.desktop.updateSettings({ autoStart: checked });
  }, []);

  const handleCloseToTrayChange = useCallback((checked: boolean) => {
    window.desktop.updateSettings({ closeToTray: checked });
  }, []);

  const handleStartToTrayChange = useCallback((checked: boolean) => {
    window.desktop.updateSettings({ startToTray: checked });
  }, []);

  const handleDynamicTrayIconChange = useCallback((checked: boolean) => {
    window.desktop.updateSettings({ dynamicTrayIcon: checked });
  }, []);

  const handleSpellcheckChange = useCallback((checked: boolean) => {
    window.desktop.updateSettings({ spellcheck: checked });
  }, []);

  const handleThrottleChange = useCallback((checked: boolean) => {
    window.desktop.updateSettings({ throttleHiddenServers: checked });
  }, []);

  const handleCaptureAllAudioOutputsChange = useCallback((checked: boolean) => {
    window.desktop.updateSettings({ captureAllAudioOutputs: checked });
  }, []);

  const handleAttenuationEnabledChange = useCallback((checked: boolean) => {
    window.desktop.updateSettings({ attenuationEnabled: checked });
  }, []);

  const handleAttenuationPercentChange = useCallback(([percent]: number[]) => {
    if (percent !== undefined) {
      window.desktop.updateSettings({ attenuationPercent: percent });
    }
  }, []);

  const handleAttenuateWhenOthersSpeakChange = useCallback(
    (checked: boolean) => {
      window.desktop.updateSettings({ attenuateWhenOthersSpeak: checked });
    },
    []
  );

  const handleAttenuateWhenSelfSpeaksChange = useCallback(
    (checked: boolean) => {
      window.desktop.updateSettings({ attenuateWhenSelfSpeaks: checked });
    },
    []
  );

  const attenuationPercentValue = useMemo(
    () => [settings.attenuationPercent],
    [settings.attenuationPercent]
  );

  const handleGetAppFolder = useCallback(
    () => window.desktop.getAppFolder(),
    []
  );

  const handleOpenAppFolder = useCallback(() => {
    window.desktop.openAppFolder();
  }, []);

  const handleGetLogsFolder = useCallback(
    () => window.desktop.getLogsFolder(),
    []
  );

  const handleOpenLogsFolder = useCallback(() => {
    window.desktop.openLogsFolder();
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
          label={t('settings.autoStart')}
          description={t('settings.autoStartDescription')}
        >
          <Switch
            checked={settings.autoStart}
            onCheckedChange={handleAutoStartChange}
          />
        </Group>
        {hasTray && (
          <Group
            label={t('settings.closeToTray')}
            description={t('settings.closeToTrayDescription')}
          >
            <Switch
              checked={settings.closeToTray}
              onCheckedChange={handleCloseToTrayChange}
            />
          </Group>
        )}
        {hasTray && settings.closeToTray && (
          <Group
            label={t('settings.startToTray')}
            description={t('settings.startToTrayDescription')}
          >
            <Switch
              checked={settings.startToTray}
              onCheckedChange={handleStartToTrayChange}
            />
          </Group>
        )}
        {hasTray && (
          <Group
            label={t('settings.dynamicTrayIcon')}
            description={t('settings.dynamicTrayIconDescription')}
          >
            <Switch
              checked={settings.dynamicTrayIcon}
              onCheckedChange={handleDynamicTrayIconChange}
            />
          </Group>
        )}
        <Group
          label={t('settings.connectAllOnStartup')}
          description={t('settings.connectAllOnStartupDescription')}
        >
          <Switch
            checked={settings.connectAllOnStartup}
            onCheckedChange={handleConnectAllChange}
          />
        </Group>
        <Group
          label={t('settings.spellcheck')}
          description={t('settings.spellcheckDescription')}
        >
          <Switch
            checked={settings.spellcheck}
            onCheckedChange={handleSpellcheckChange}
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
      {isWindows && (
        <SettingsSection title={t('settings.attenuation')}>
          <Group
            label={t('settings.attenuationEnabled')}
            description={t('settings.attenuationEnabledDescription')}
          >
            <Switch
              checked={settings.attenuationEnabled}
              onCheckedChange={handleAttenuationEnabledChange}
            />
          </Group>
          {settings.attenuationEnabled && (
            <>
              <Group
                label={t('settings.attenuationStrength')}
                description={t('settings.attenuationStrengthDescription')}
              >
                <Slider
                  className="max-w-xs"
                  min={0}
                  max={100}
                  step={1}
                  value={attenuationPercentValue}
                  onValueChange={handleAttenuationPercentChange}
                  rightSlot={
                    <span className="text-sm text-muted-foreground w-10 text-right">
                      {settings.attenuationPercent}%
                    </span>
                  }
                />
              </Group>
              <Group
                label={t('settings.attenuateWhenOthersSpeak')}
                description={t('settings.attenuateWhenOthersSpeakDescription')}
              >
                <Switch
                  checked={settings.attenuateWhenOthersSpeak}
                  onCheckedChange={handleAttenuateWhenOthersSpeakChange}
                />
              </Group>
              <Group
                label={t('settings.attenuateWhenSelfSpeaks')}
                description={t('settings.attenuateWhenSelfSpeaksDescription')}
              >
                <Switch
                  checked={settings.attenuateWhenSelfSpeaks}
                  onCheckedChange={handleAttenuateWhenSelfSpeaksChange}
                />
              </Group>
            </>
          )}
        </SettingsSection>
      )}
      {isLinux && (
        <SettingsSection title={t('settings.screenShare')}>
          <Group
            label={t('settings.captureAllAudioOutputs')}
            description={t('settings.captureAllAudioOutputsDescription')}
          >
            <Switch
              checked={settings.captureAllAudioOutputs}
              onCheckedChange={handleCaptureAllAudioOutputsChange}
            />
          </Group>
        </SettingsSection>
      )}
      <FolderSettings
        title={t('settings.appFolder')}
        description={t('settings.appFolderDescription')}
        openLabel={t('settings.openAppFolder')}
        getFolder={handleGetAppFolder}
        onOpen={handleOpenAppFolder}
      />
      <FolderSettings
        title={t('settings.logsFolder')}
        description={t('settings.logsFolderDescription')}
        openLabel={t('settings.openLogsFolder')}
        getFolder={handleGetLogsFolder}
        onOpen={handleOpenLogsFolder}
      />
    </>
  );
});

export { GeneralSettings };
