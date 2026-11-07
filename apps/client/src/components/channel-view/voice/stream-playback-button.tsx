import { useIsOwnUser } from '@/features/server/users/hooks';
import { useVoice } from '@/features/server/voice/hooks';
import { cn } from '@/lib/utils';
import { getTrpcError, StreamKind } from '@sharkord/shared';
import { Button } from '@sharkord/ui';
import { Pause, Play } from 'lucide-react';
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

type TStreamPlaybackButtonProps = {
  userId: number;
  kind: StreamKind.VIDEO | StreamKind.SCREEN;
};

const StreamPlaybackButton = memo(
  ({ userId, kind }: TStreamPlaybackButtonProps) => {
    const { t } = useTranslation('common');
    const { remoteUserStreams, isRemotePlaybackPaused, setRemotePlayback } =
      useVoice();
    const isOwnUser = useIsOwnUser(userId);
    const [pending, setPending] = useState(false);
    const stream = remoteUserStreams[userId]?.[kind];
    const tracks = stream?.getVideoTracks();
    const track = tracks?.[0];
    const paused = isRemotePlaybackPaused(userId, kind);

    const togglePlayback = useCallback(async () => {
      if (!track || pending) return;

      setPending(true);
      try {
        await setRemotePlayback(userId, kind, track, !paused);
      } catch (error) {
        toast.error(getTrpcError(error, t('failedToChangeStreamPlayback')));
      } finally {
        setPending(false);
      }
    }, [kind, paused, pending, setRemotePlayback, t, track, userId]);

    if (isOwnUser || !track) return null;

    const label = paused ? t('resumeStreamPlayback') : t('pauseStreamPlayback');

    return (
      <Button
        type="button"
        variant="secondary"
        size={paused ? 'sm' : 'icon'}
        className={cn(
          'absolute z-10 transition-colors',
          paused
            ? 'left-1/2 top-1/2 max-w-[95%] -translate-x-1/2 -translate-y-1/2'
            : 'left-1/2 top-1 -translate-x-1/2 size-7'
        )}
        title={label}
        aria-label={label}
        disabled={pending}
        onClick={togglePlayback}
      >
        {paused ? <Play /> : <Pause />}
        {paused && <span className="min-w-0 truncate">{label}</span>}
      </Button>
    );
  }
);

export { StreamPlaybackButton };
