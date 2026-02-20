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

const Updates = memo(() => {
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
        <CardTitle>Updates</CardTitle>
        <CardDescription>
          Check for and install updates to keep your Sharkord server running
          with the latest features and security improvements.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Group label="Current Version">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4" />
            <span className="font-mono">{currentVersion || 'Unknown'}</span>
          </div>
        </Group>

        <Group label="Latest Version">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowUpCircle className="h-4 w-4" />
            <span className="font-mono">{latestVersion || 'Unknown'}</span>
          </div>
        </Group>

        {!canUpdate ? (
          <Alert variant="destructive">
            <X />
            <AlertTitle>Updates Not Supported</AlertTitle>
            <AlertDescription>
              Automatic updates are not supported in this environment. Please
              refer to the documentation for manual update instructions.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {hasUpdate && (
              <Alert>
                <Download />
                <AlertTitle>Update Available</AlertTitle>
                <AlertDescription>
                  A new version ({latestVersion}) is available for download.
                  Updating will restart the server and may cause temporary
                  downtime.
                </AlertDescription>
              </Alert>
            )}

            {!hasUpdate && !loading && (
              <Alert variant="info">
                <CheckCircle />
                <AlertTitle>Up to Date</AlertTitle>
                <AlertDescription>
                  Your server is running the latest version of Sharkord.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={closeServerScreens}>
            Close
          </Button>
          <Button
            onClick={update}
            disabled={loading || !hasUpdate || !canUpdate}
          >
            {hasUpdate ? 'Update Server' : 'No Updates Available'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

export { Updates };
