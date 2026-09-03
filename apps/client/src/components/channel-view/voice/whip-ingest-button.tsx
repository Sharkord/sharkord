import { getTRPCClient } from '@/lib/trpc';
import {
  IconButton,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@sharkord/ui';
import { Check, Copy, Radio } from 'lucide-react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { memo, useCallback, useState } from 'react';
import { toast } from 'sonner';

type TWhipIngestButtonProps = {
  channelId: number;
  className?: string;
};

type TWhipIngestInfo = {
  enabled: boolean;
  path: string;
  key: string | null;
};

const WhipIngestButton = memo(
  ({ channelId, className }: TWhipIngestButtonProps) => {
    const [info, setInfo] = useState<TWhipIngestInfo | null>(null);
    const [hasError, setHasError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [copiedField, setCopiedField] = useState<'url' | 'key' | null>(null);

    const loadInfo = useCallback(async () => {
      setIsLoading(true);
      setHasError(false);

      try {
        setInfo(
          await getTRPCClient().voice.getWhipIngestInfo.query({ channelId })
        );
      } catch {
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    }, [channelId]);

    const handleOpenChange = useCallback(
      (open: boolean) => {
        if (open) void loadInfo();
      },
      [loadInfo]
    );

    const handleCopy = useCallback(
      async (field: 'url' | 'key', value: string) => {
        try {
          await navigator.clipboard.writeText(value);

          setCopiedField(field);
          setTimeout(() => setCopiedField(null), 2000);
        } catch (error) {
          toast.error(`Could not copy: ${String(error)}`);
        }
      },
      []
    );

    const stopPropagation = useCallback((event: ReactMouseEvent) => {
      event.stopPropagation();
    }, []);

    const ingestUrl = info ? `${window.location.origin}${info.path}` : '';

    return (
      <Popover onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <IconButton
            variant="ghost"
            icon={Radio}
            title="WHIP ingest"
            size="sm"
            className={className}
            onClick={stopPropagation}
          />
        </PopoverTrigger>
        <PopoverContent
          align="center"
          side="top"
          className="w-96"
          onClick={stopPropagation}
        >
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : hasError ? (
            <p className="text-sm text-muted-foreground">
              Could not load the WHIP ingest info. Make sure you have permission
              to share your screen in this channel.
            </p>
          ) : !info?.enabled ? (
            <p className="text-sm text-muted-foreground">
              WHIP ingest is disabled on this server.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                Point OBS or any WHIP encoder at this URL to broadcast into this
                channel:
              </p>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={ingestUrl}
                  className="font-mono text-xs"
                />
                <IconButton
                  variant="ghost"
                  icon={copiedField === 'url' ? Check : Copy}
                  title="Copy URL"
                  size="sm"
                  onClick={() => void handleCopy('url', ingestUrl)}
                />
              </div>
              {info.key ? (
                <>
                  <p className="text-sm text-muted-foreground">Bearer key:</p>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={info.key}
                      className="font-mono text-xs"
                    />
                    <IconButton
                      variant="ghost"
                      icon={copiedField === 'key' ? Check : Copy}
                      title="Copy key"
                      size="sm"
                      onClick={() => void handleCopy('key', info.key ?? '')}
                    />
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Screen sharing from the app uses this endpoint automatically
                  with your session. External encoders need a server key, which
                  is not configured.
                </p>
              )}
            </div>
          )}
        </PopoverContent>
      </Popover>
    );
  }
);

WhipIngestButton.displayName = 'WhipIngestButton';

export { WhipIngestButton };
