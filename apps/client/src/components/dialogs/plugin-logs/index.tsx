import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { getTRPCClient } from '@/lib/trpc';
import { AlertCircle, Bug, Info } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TDialogBaseProps } from '../types';

type TLogEntry = {
  type: 'info' | 'error' | 'debug';
  timestamp: number;
  message: string;
};

type TPluginLogsDialogProps = TDialogBaseProps & {
  pluginId: string;
};

const LogEntry = memo(({ log }: { log: TLogEntry }) => {
  const color = useMemo(() => {
    switch (log.type) {
      case 'error':
        return 'text-destructive';
      case 'debug':
        return 'text-muted-foreground';
      case 'info':
      default:
        return 'text-primary';
    }
  }, [log.type]);

  const Icon = useMemo(() => {
    switch (log.type) {
      case 'error':
        return (
          <AlertCircle
            className={`w-3.5 h-3.5 ${color} flex-shrink-0 mt-0.5`}
          />
        );
      case 'debug':
        return <Bug className={`w-3.5 h-3.5 ${color} flex-shrink-0 mt-0.5`} />;
      case 'info':
      default:
        return <Info className={`w-3.5 h-3.5 ${color} flex-shrink-0 mt-0.5`} />;
    }
  }, [log.type, color]);

  return (
    <div className="flex items-start gap-2 py-0.5 px-2 rounded hover:bg-muted/50 font-mono text-xs">
      {Icon}
      <span className="text-muted-foreground flex-shrink-0 min-w-[70px]">
        {new Date(log.timestamp).toLocaleTimeString()}
      </span>
      <span className="flex-1 break-all">{log.message}</span>
    </div>
  );
});

const useSubscribeToPluginLogs = (pluginId: string) => {
  const [logs, setLogs] = useState<TLogEntry[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subRef = useRef<any>(null);
  const loadedFirstLogs = useRef(false);

  const setupSubscription = useCallback(async () => {
    const trpc = getTRPCClient();

    try {
      if (!loadedFirstLogs.current) {
        const logs = await trpc.plugins.getLogs.query({ pluginId });

        setLogs(logs);
        loadedFirstLogs.current = true;
      }

      if (subRef.current) return;

      subRef.current = trpc.plugins.onLog.subscribe(undefined, {
        onData: (data) => {
          if (data.pluginId === pluginId) {
            setLogs((prevLogs) => [...prevLogs, data]);
          }
        },
        onError: (err) => console.error('onPluginLog subscription error:', err)
      });
    } catch (error) {
      console.error('Failed to subscribe to plugin logs:', error);
    }
  }, [pluginId]);

  useEffect(() => {
    setupSubscription();

    return () => {
      if (subRef.current) {
        subRef.current.unsubscribe();
      }
    };
  }, [pluginId, setupSubscription]);

  return logs;
};

const PluginLogsDialog = memo(
  ({ isOpen, close, pluginId }: TPluginLogsDialogProps) => {
    const logs = useSubscribeToPluginLogs(pluginId);
    const [logLimit, setLogLimit] = useState<'100' | '500' | 'all'>('100');
    const scrollRef = useRef<HTMLDivElement>(null);
    const [autoScroll, setAutoScroll] = useState(true);

    const handleLogLimitChange = useCallback((value: string) => {
      setLogLimit(value as '100' | '500' | 'all');
    }, []);

    const sortedLogs = useMemo(() => {
      const sorted = [...logs].sort((a, b) => a.timestamp - b.timestamp); // Oldest first

      if (logLimit === 'all') {
        return sorted;
      }

      const limit = parseInt(logLimit, 10);
      // Get the last N logs (most recent)
      return sorted.slice(-limit);
    }, [logs, logLimit]);

    // Auto-scroll to bottom when new logs arrive
    useEffect(() => {
      if (autoScroll && scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, [sortedLogs, autoScroll]);

    // Detect if user scrolled up manually
    const handleScroll = useCallback(() => {
      if (!scrollRef.current) return;

      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isAtBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 10;

      setAutoScroll(isAtBottom);
    }, []);

    const errorCount = useMemo(
      () => logs.filter((log) => log.type === 'error').length,
      [logs]
    );

    const debugCount = useMemo(
      () => logs.filter((log) => log.type === 'debug').length,
      [logs]
    );

    const infoCount = useMemo(
      () => logs.filter((log) => log.type === 'info').length,
      [logs]
    );

    return (
      <Dialog open={isOpen} onOpenChange={close}>
        <DialogContent className="flex flex-col min-w-[64vw] h-[80vh]">
          <DialogHeader>
            <DialogTitle>{pluginId}</DialogTitle>
          </DialogHeader>

          {/* Stats */}
          <div className="flex items-center gap-3 mt-4 text-sm">
            <div className="flex items-center gap-1.5">
              <Info className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">
                Info: <span className="font-semibold">{infoCount}</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-destructive" />
              <span className="text-muted-foreground">
                Errors: <span className="font-semibold">{errorCount}</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Bug className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                Debug: <span className="font-semibold">{debugCount}</span>
              </span>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <span className="text-muted-foreground">
                Total: <span className="font-semibold">{logs.length}</span> logs
              </span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs">Show:</span>
                <Select value={logLimit} onValueChange={handleLogLimitChange}>
                  <SelectTrigger className="h-7 w-[100px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="100">100 logs</SelectItem>
                    <SelectItem value="500">500 logs</SelectItem>
                    <SelectItem value="all">All logs</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Logs Content */}
          <div className="flex-1 min-h-0 mt-4">
            {sortedLogs.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <Info className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No logs yet</p>
                  <p className="text-sm mt-1">
                    Logs will appear here when the plugin generates them
                  </p>
                </div>
              </div>
            ) : (
              <div
                ref={scrollRef}
                className="h-full overflow-y-auto"
                onScroll={handleScroll}
              >
                <div className="space-y-0.5 pr-4">
                  {sortedLogs.map((log, index) => (
                    <LogEntry key={`${log.timestamp}-${index}`} log={log} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }
);

PluginLogsDialog.displayName = 'PluginLogsDialog';

export { PluginLogsDialog };
