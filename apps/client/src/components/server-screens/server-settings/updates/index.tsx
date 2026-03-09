import { closeServerScreens } from '@/features/server-screens/actions';
import { useAdminUpdates } from '@/features/server/admin/hooks';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('updatesTitle')}</CardTitle>
        <CardDescription>{t('updatesDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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

        {!canUpdate ? (
          <Alert variant="destructive">
            <X />
            <AlertTitle>{t('updatesNotSupportedTitle')}</AlertTitle>
            <AlertDescription>{t('updatesNotSupportedDesc')}</AlertDescription>
          </Alert>
        ) : (
          <>
            {hasUpdate && (
              <Alert>
                <Download />
                <AlertTitle>{t('updateAvailableTitle')}</AlertTitle>
                <AlertDescription>
                  {t('updateAvailableDesc', { version: latestVersion })}
                </AlertDescription>
              </Alert>
            )}

            {!hasUpdate && !loading && (
              <Alert variant="info">
                <CheckCircle />
                <AlertTitle>{t('upToDateTitle')}</AlertTitle>
                <AlertDescription>{t('upToDateDesc')}</AlertDescription>
              </Alert>
            )}
          </>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={closeServerScreens}>
            {t('close')}
          </Button>
          <Button
            onClick={update}
            disabled={loading || !hasUpdate || !canUpdate}
          >
            {hasUpdate ? t('updateServerBtn') : t('noUpdatesAvailableBtn')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

export { Updates };
