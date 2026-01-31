import { type TParsedDomCommand } from '@sharkord/shared';
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
  Terminal,
  XCircle
} from 'lucide-react';
import { memo, useCallback, useState } from 'react';
import { OverrideLayout } from './layout';

type TCommandOverrideProps = {
  command: TParsedDomCommand;
};

const CommandOverride = memo(({ command }: TCommandOverrideProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatValue = useCallback((value: unknown): string => {
    if (value === undefined || value === null || value === '') {
      return 'undefined';
    }

    if (typeof value === 'string') {
      return value;
    }

    return JSON.stringify(value);
  }, []);

  const getStatusIcon = useCallback(() => {
    switch (command.status) {
      case 'completed':
        return <CheckCircle2 className="size-3 text-green-500" />;
      case 'failed':
        return <XCircle className="size-3 text-red-500" />;
      case 'pending':
      default:
        return (
          <Loader2 className="size-3 animate-spin text-muted-foreground" />
        );
    }
  }, [command.status]);

  const getStatusText = useCallback(() => {
    switch (command.status) {
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'pending':
      default:
        return 'Pending';
    }
  }, [command.status]);

  return (
    <OverrideLayout>
      <div className="flex gap-3 rounded-lg border border-border bg-muted/50 px-3 py-2.5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded text-primary">
          {command.logo ? (
            <img
              src={command.logo}
              alt=""
              className="size-5 rounded object-cover"
            />
          ) : (
            <Terminal className="size-5" />
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              {command.commandName}
            </span>
            <div className="flex items-center gap-1.5">
              {getStatusIcon()}
              <span className="text-xs font-medium text-muted-foreground">
                {getStatusText()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {command.pluginId}
          </div>

          {command.args.length > 0 && (
            <div className="mt-0.5 flex flex-col gap-1 rounded-md bg-background/50 px-2 py-1.5">
              {command.args.map((arg, index) => (
                <div key={index} className="flex items-baseline gap-2">
                  <span className="shrink-0 text-xs font-medium text-muted-foreground">
                    {arg.name}:
                  </span>
                  <span className="truncate font-mono text-xs text-foreground">
                    {formatValue(arg.value)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {command.response && (
            <div className="mt-0.5 flex flex-col rounded-md border border-border/50 bg-background/50">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex w-full items-center gap-2 px-2 py-1.5 text-left transition-colors hover:bg-muted/50"
              >
                {isExpanded ? (
                  <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="size-3 shrink-0 text-muted-foreground" />
                )}
                <span className="text-xs font-medium text-muted-foreground">
                  Response
                </span>
              </button>

              {isExpanded && (
                <div className="border-t border-border/50 px-2 py-1.5">
                  <pre className="whitespace-pre-wrap break-words break-all font-mono text-xs text-foreground">
                    {command.response}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </OverrideLayout>
  );
});

export { CommandOverride };
