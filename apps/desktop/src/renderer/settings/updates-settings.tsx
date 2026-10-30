import {
  Group,
  SettingsSection,
  Switch,
  UpdatePanel,
  type TUpdateTone
} from '@sharkord/ui';
import {
  CircleAlert,
  CircleArrowUp,
  CircleCheck,
  CircleSlash,
  Download,
  RefreshCw,
  type LucideIcon
} from 'lucide-react';
import { memo, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { TDesktopSettings, TUpdateStatus } from '../../shared/types';
import { UpdateAction } from './update-action';
import { useUpdateState } from './use-update-state';

const STATUS_LOOKS: Record<
  TUpdateStatus,
  { tone: TUpdateTone; icon: LucideIcon; busy?: boolean }
> = {
  unsupported: { tone: 'warning', icon: CircleSlash },
  idle: { tone: 'muted', icon: RefreshCw },
  checking: { tone: 'muted', icon: RefreshCw, busy: true },
  'up-to-date': { tone: 'success', icon: CircleCheck },
  available: { tone: 'info', icon: Download },
  downloading: { tone: 'info', icon: RefreshCw, busy: true },
  ready: { tone: 'info', icon: CircleArrowUp },
  error: { tone: 'error', icon: CircleAlert }
};

type TUpdatesSettingsProps = {
  settings: TDesktopSettings;
};

const UpdatesSettings = memo(({ settings }: TUpdatesSettingsProps) => {
  const { t } = useTranslation();
  const state = useUpdateState();
  const hasChecked = useRef(false);

  useEffect(() => {
    if (!state || state.status !== 'idle' || hasChecked.current) {
      return;
    }

    hasChecked.current = true;
    window.desktop.checkForUpdates();
  }, [state]);

  const handleAutoUpdateChange = useCallback((checked: boolean) => {
    window.desktop.updateSettings({ autoUpdate: checked });
  }, []);

  if (!state) {
    return null;
  }

  const { status, currentVersion, latestVersion, percent, manual } = state;
  const { tone, icon, busy } = STATUS_LOOKS[status];

  let description = t(`settings.updateStatus.${status}.description`, {
    version: latestVersion,
    percent
  });

  if (status === 'available' && manual) {
    description = t('settings.updateStatus.available.manualDescription', {
      version: latestVersion
    });
  }

  let latest = latestVersion
    ? `v${latestVersion}`
    : t('settings.unknownVersion');

  if (status === 'up-to-date') {
    latest = `v${currentVersion}`;
  }

  const versions = [
    { label: t('settings.currentVersion'), value: `v${currentVersion}` },
    { label: t('settings.latestVersion'), value: latest }
  ];

  return (
    <SettingsSection
      title={t('settings.updates')}
      description={t('settings.updatesDescription')}
    >
      <UpdatePanel
        tone={tone}
        icon={icon}
        busy={busy}
        title={t(`settings.updateStatus.${status}.title`)}
        description={description}
        progress={status === 'downloading' ? percent : undefined}
        action={<UpdateAction status={status} />}
        versions={versions}
      />
      <Group
        label={t('settings.autoUpdate')}
        description={t('settings.autoUpdateDescription')}
      >
        <Switch
          checked={settings.autoUpdate}
          onCheckedChange={handleAutoUpdateChange}
        />
      </Group>
    </SettingsSection>
  );
});

export { UpdatesSettings };
