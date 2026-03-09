import { getTRPCClient } from '@/lib/trpc';
import type { TLogEntry } from '@sharkord/shared';
import { getTrpcError } from '@sharkord/shared';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@sharkord/ui';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { TDialogBaseProps } from '../types';

type TPluginLogsDialogProps = TDialogBaseProps & {
  pluginId: string;
  pluginName?: string;
};

const PluginLogsDialog = memo(
  ({ isOpen, close, pluginId, pluginName }: TPluginLogsDialogProps) => {
    const { t } = useTranslation('dialogs');
    const [logs, setLogs] = useState<TLogEntry[]>([]);
    const [showCount, setShowCount] = useState(100);

    const fetchLogs = useCallback(async () => {
      try {
        const trpc = getTRPCClient();
        const result = await trpc.plugins.getLogs.query({ pluginId });
        setLogs(result);
      } catch (error) {
        toast.error(getTrpcError(error, 'Failed to load plugin logs'));
      }
    }, [pluginId]);

    useEffect(() => {
      if (isOpen) fetchLogs();
    }, [isOpen, fetchLogs]);

    const slicedLogs = useMemo(
      () => (showCount === -1 ? logs : logs.slice(-showCount)),
      [logs, showCount]
    );

    const counts = useMemo(() => {
      const info = logs.filter((l) => l.type === 'info').length;
      const errors = logs.filter((l) => l.type === 'error').length;
      const debug = logs.filter((l) => l.type === 'debug').length;

      return { info, errors, debug };
    }, [logs]);

    return (
      <Dialog open={isOpen}>
        <DialogContent
          onInteractOutside={close}
          close={close}
          className="max-w-2xl"
        >
          <DialogHeader>
            <DialogTitle>{pluginName ?? pluginId}</DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              {t('infoLabel')} {counts.info}
            </span>
            <span>
              {t('errorsLabel')} {counts.errors}
            </span>
            <span>
              {t('debugLabel')} {counts.debug}
            </span>
            <span className="ml-auto">
              {t('totalLogs', { count: logs.length })}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {t('showLabel')}
            </span>
            <Select
              value={showCount.toString()}
              onValueChange={(v) => setShowCount(Number(v))}
            >
              <SelectTrigger className="w-28 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="100">{t('logs100')}</SelectItem>
                <SelectItem value="500">{t('logs500')}</SelectItem>
                <SelectItem value="-1">{t('logsAll')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="max-h-96 overflow-y-auto font-mono text-xs bg-muted/30 rounded p-3 space-y-1">
            {slicedLogs.length === 0 ? (
              <div className="text-muted-foreground text-center py-8">
                <p>{t('noLogsYet')}</p>
                <p className="text-xs mt-1">{t('logsWillAppear')}</p>
              </div>
            ) : (
              slicedLogs.map((log, i) => (
                <div
                  key={i}
                  className={
                    log.type === 'error'
                      ? 'text-destructive'
                      : log.type === 'debug'
                        ? 'text-muted-foreground'
                        : ''
                  }
                >
                  <Badge variant="outline" className="mr-2 text-[10px] py-0">
                    {log.type}
                  </Badge>
                  <span className="text-muted-foreground mr-2">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  {log.message}
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={close}>
              {t('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

export { PluginLogsDialog };
