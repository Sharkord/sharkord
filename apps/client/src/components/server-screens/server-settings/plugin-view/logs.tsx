import { SettingsSection } from '@/components/server-screens/settings-shell/section';
import { getTRPCClient } from '@/lib/trpc';
import type { TLogEntry } from '@sharkord/shared';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@sharkord/ui';
import { AlertCircle, Bug, Info } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StatePanel } from '../../settings-shell/state-panel';

const LOG_STYLES = {
  error: { color: 'text-destructive', icon: AlertCircle },
  debug: { color: 'text-muted-foreground', icon: Bug },
  info: { color: 'text-primary', icon: Info }
} as const;

type TLogLineProps = {
  log: TLogEntry;
};

const LogLine = memo(({ log }: TLogLineProps) => {
  const { color, icon: Icon } = LOG_STYLES[log.type] ?? LOG_STYLES.info;

  return (
    <div className="flex items-start gap-2 rounded px-2 py-0.5 font-mono text-xs hover:bg-muted/50">
      <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${color}`} />
      <span className="min-w-[70px] shrink-0 text-muted-foreground">
        {new Date(log.timestamp).toLocaleTimeString()}
      </span>
      <span className="flex-1 break-all">{log.message}</span>
    </div>
  );
});

const usePluginLogs = (pluginId: string) => {
  const [logs, setLogs] = useState<TLogEntry[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subRef = useRef<any>(null);

  useEffect(() => {
    const trpc = getTRPCClient();

    const setup = async () => {
      try {
        setLogs(await trpc.plugins.getLogs.query({ pluginId }));

        subRef.current = trpc.plugins.onLog.subscribe(undefined, {
          onData: (data) => {
            if (data.pluginId !== pluginId) return;

            setLogs((prevLogs) => [...prevLogs, data]);
          },
          onError: (err) =>
            console.error('onPluginLog subscription error:', err)
        });
      } catch (error) {
        console.error('Failed to subscribe to plugin logs:', error);
      }
    };

    setup();

    return () => subRef.current?.unsubscribe();
  }, [pluginId]);

  return logs;
};

type TPluginLogsProps = {
  pluginId: string;
};

const PluginLogs = memo(({ pluginId }: TPluginLogsProps) => {
  const { t } = useTranslation('settings');
  const logs = usePluginLogs(pluginId);
  const [logLimit, setLogLimit] = useState('100');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const sortedLogs = useMemo(() => {
    const sorted = [...logs].sort((a, b) => a.timestamp - b.timestamp);

    if (logLimit === 'all') return sorted;

    return sorted.slice(-parseInt(logLimit, 10));
  }, [logs, logLimit]);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [sortedLogs, autoScroll]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;

    setAutoScroll(Math.abs(scrollHeight - scrollTop - clientHeight) < 10);
  }, []);

  const counts = useMemo(
    () => ({
      info: logs.filter((log) => log.type === 'info').length,
      error: logs.filter((log) => log.type === 'error').length,
      debug: logs.filter((log) => log.type === 'debug').length
    }),
    [logs]
  );

  let content = (
    <StatePanel
      icon={Info}
      title={t('noLogsYet')}
      description={t('logsWillAppear')}
    />
  );

  if (sortedLogs.length > 0) {
    content = (
      <div
        ref={scrollRef}
        className="max-h-[60vh] space-y-0.5 overflow-y-auto"
        onScroll={handleScroll}
      >
        {sortedLogs.map((log, index) => (
          <LogLine key={`${log.timestamp}-${index}`} log={log} />
        ))}
      </div>
    );
  }

  return (
    <SettingsSection
      title={t('logsTitle')}
      description={t('logsDesc')}
      action={
        <Select value={logLimit} onValueChange={setLogLimit}>
          <SelectTrigger className="h-8 w-[110px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="100">{t('logs100')}</SelectItem>
            <SelectItem value="500">{t('logs500')}</SelectItem>
            <SelectItem value="all">{t('logsAll')}</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Info className="h-4 w-4 text-primary" />
          {t('infoLabel')} <span className="font-semibold">{counts.info}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <AlertCircle className="h-4 w-4 text-destructive" />
          {t('errorsLabel')}{' '}
          <span className="font-semibold">{counts.error}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Bug className="h-4 w-4 text-muted-foreground" />
          {t('debugLabel')}{' '}
          <span className="font-semibold">{counts.debug}</span>
        </span>
        <span className="ml-auto">
          {t('totalLogs', { count: logs.length })}
        </span>
      </div>

      {content}
    </SettingsSection>
  );
});

export { PluginLogs };
