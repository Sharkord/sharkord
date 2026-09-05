import { SettingsSection } from '@/components/server-screens/settings-shell/section';
import { useAdminUpdates } from '@/features/server/admin/hooks';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Group,
  LoadingCard
} from '@sharkord/ui';
import { ArrowUpCircle, CheckCircle, Download, X } from 'lucide-react';
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
    update
  } = useAdminUpdates();

  if (loading) {
    return <LoadingCard className="h-[600px]" />;
  }

  let status = (
    <Alert variant="info">
      <CheckCircle />
      <AlertTitle>{t('upToDateTitle')}</AlertTitle>
      <AlertDescription>{t('upToDateDesc')}</AlertDescription>
    </Alert>
  );

  if (!canUpdate) {
    status = (
      <Alert variant="destructive">
        <X />
        <AlertTitle>{t('updatesNotSupportedTitle')}</AlertTitle>
        <AlertDescription>{t('updatesNotSupportedDesc')}</AlertDescription>
      </Alert>
    );
  } else if (hasUpdate) {
    status = (
      <Alert>
        <Download />
        <AlertTitle>{t('updateAvailableTitle')}</AlertTitle>
        <AlertDescription>
          {t('updateAvailableDesc', { version: latestVersion })}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <SettingsSection
      title={t('updatesTitle')}
      description={t('updatesDesc')}
      action={
        <Button onClick={update} disabled={!hasUpdate || !canUpdate}>
          {t('updateServerBtn')}
        </Button>
      }
    >
      <Group label={t('currentVersionLabel')}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle className="h-4 w-4" />
          <span className="font-mono">
            {currentVersion || t('unknownVersion')}
          </span>
        </div>
      </Group>

      <Group label={t('latestVersionLabel')}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowUpCircle className="h-4 w-4" />
          <span className="font-mono">
            {latestVersion || t('unknownVersion')}
          </span>
        </div>
      </Group>

      {status}
    </SettingsSection>
  );
});

export { Updates };
