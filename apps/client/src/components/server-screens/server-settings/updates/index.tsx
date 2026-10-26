import { useAdminUpdates } from '@/features/server/admin/hooks';
import {
  Button,
  SettingsSection,
  UpdatePanel,
  type TUpdatePanelProps
} from '@sharkord/ui';
import { CircleCheck, CircleSlash, Download, RefreshCw } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

const Updates = memo(() => {
  const { t } = useTranslation('settings');
  const {
    loading,
    hasUpdate,
    latestVersion,
    currentVersion,
    canUpdate,
    refetch,
    update
  } = useAdminUpdates();

  let panel: Omit<TUpdatePanelProps, 'versions'>;

  if (loading) {
    panel = {
      tone: 'muted',
      icon: RefreshCw,
      busy: true,
      title: t('updateCheckingTitle'),
      description: t('updateCheckingDesc')
    };
  } else if (!canUpdate) {
    panel = {
      tone: 'warning',
      icon: CircleSlash,
      title: t('updatesNotSupportedTitle'),
      description: t('updatesNotSupportedDesc')
    };
  } else if (hasUpdate) {
    panel = {
      tone: 'info',
      icon: Download,
      title: t('updateAvailableTitle'),
      description: t('updateAvailableDesc', { version: latestVersion }),
      action: <Button onClick={update}>{t('updateServerBtn')}</Button>
    };
  } else {
    panel = {
      tone: 'success',
      icon: CircleCheck,
      title: t('upToDateTitle'),
      description: t('upToDateDesc'),
      action: (
        <Button variant="outline" onClick={refetch}>
          {t('checkForUpdatesBtn')}
        </Button>
      )
    };
  }

  const versions = [
    {
      label: t('currentVersionLabel'),
      value: currentVersion ? `v${currentVersion}` : t('unknownVersion')
    },
    {
      label: t('latestVersionLabel'),
      value: latestVersion ? `v${latestVersion}` : t('unknownVersion')
    }
  ];

  return (
    <SettingsSection title={t('updatesTitle')} description={t('updatesDesc')}>
      <UpdatePanel {...panel} versions={versions} />
    </SettingsSection>
  );
});

export { Updates };
