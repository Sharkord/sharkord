import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Group } from '@/components/ui/group';
import { LoadingCard } from '@/components/ui/loading-card';
import { closeServerScreens } from '@/features/server-screens/actions';
import { useAdminUpdates } from '@/features/server/admin/hooks';
import { ArrowUpCircle, CheckCircle, Download, X } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

const Updates = memo(() => {
  const { t } = useTranslation();
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
        <CardTitle>{t('serverSettings.updates.title')}</CardTitle>
        <CardDescription>
          {t('serverSettings.updates.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Group label={t('serverSettings.updates.currentVersion')}>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4" />
            <span className="font-mono">
              {currentVersion || t('serverSettings.updates.unknown')}
            </span>
          </div>
        </Group>

        <Group label={t('serverSettings.updates.latestVersion')}>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowUpCircle className="h-4 w-4" />
            <span className="font-mono">
              {latestVersion || t('serverSettings.updates.unknown')}
            </span>
          </div>
        </Group>

        {!canUpdate ? (
          <Alert variant="destructive">
            <X />
            <AlertTitle>{t('serverSettings.updates.notSupportedTitle')}</AlertTitle>
            <AlertDescription>
              {t('serverSettings.updates.notSupportedDescription')}
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {hasUpdate && (
              <Alert>
                <Download />
                <AlertTitle>{t('serverSettings.updates.availableTitle')}</AlertTitle>
                <AlertDescription>
                  {t('serverSettings.updates.availableDescription', {
                    version: latestVersion
                  })}
                </AlertDescription>
              </Alert>
            )}

            {!hasUpdate && !loading && (
              <Alert variant="info">
                <CheckCircle />
                <AlertTitle>{t('serverSettings.updates.upToDateTitle')}</AlertTitle>
                <AlertDescription>
                  {t('serverSettings.updates.upToDateDescription')}
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={closeServerScreens}>
            {t('serverSettings.actions.close')}
          </Button>
          <Button
            onClick={update}
            disabled={loading || !hasUpdate || !canUpdate}
          >
            {hasUpdate
              ? t('serverSettings.updates.updateServer')
              : t('serverSettings.updates.noUpdates')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

export { Updates };
