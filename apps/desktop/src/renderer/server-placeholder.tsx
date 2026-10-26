import { Button, Spinner } from '@sharkord/ui';
import { CircleAlert } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { TServer } from '../shared/types';

type TServerPlaceholderProps = {
  server: TServer;
  failed: boolean;
};

const ServerPlaceholder = memo(
  ({ server, failed }: TServerPlaceholderProps) => {
    const { t } = useTranslation();

    const handleRetry = useCallback(() => {
      window.desktop.retryServer(server.id);
    }, [server.id]);

    if (!failed) {
      return (
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Spinner size="sm" />
          <span className="text-sm">
            {t('serverPlaceholder.loading', { name: server.name })}
          </span>
        </div>
      );
    }

    return (
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        <CircleAlert className="size-10 text-red-500" />
        <span className="font-medium">
          {t('serverPlaceholder.errorTitle', { name: server.name })}
        </span>
        <span className="text-sm text-muted-foreground">
          {t('serverPlaceholder.errorDescription')}
        </span>
        <Button variant="outline" className="mt-2" onClick={handleRetry}>
          {t('serverPlaceholder.retry')}
        </Button>
      </div>
    );
  }
);

export { ServerPlaceholder };
