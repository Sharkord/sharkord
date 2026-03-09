import { getTRPCClient } from '@/lib/trpc';
import { getTrpcError } from '@sharkord/shared';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Group
} from '@sharkord/ui';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

type TSecurityProps = {
  channelId: number;
};

const Security = memo(({ channelId }: TSecurityProps) => {
  const { t } = useTranslation('settings');
  const onRotateToken = useCallback(async () => {
    const trpc = getTRPCClient();

    try {
      await trpc.channels.rotateFileAccessToken.mutate({ channelId });

      toast.success(t('tokenRotatedSuccess'));
    } catch (error) {
      toast.error(getTrpcError(error, t('failedRotateToken')));
    }
  }, [channelId, t]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('securityTitle')}</CardTitle>
        <CardDescription>{t('securityDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Group
          label={t('fileAccessTokenLabel')}
          help={t('fileAccessTokenHelp')}
        >
          <p className="text-sm text-muted-foreground">
            {t('fileAccessTokenDesc')}
          </p>
          <Button variant="destructive" onClick={onRotateToken}>
            {t('rotateTokenBtn')}
          </Button>
        </Group>
      </CardContent>
    </Card>
  );
});

export { Security };
