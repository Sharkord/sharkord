import { useVoice } from '@/features/server/voice/hooks';
import type { TPausableStreamKind } from '@sharkord/shared';
import { useCallback } from 'react';

export const useStreamPause = (streamId: number, kind: TPausableStreamKind) => {
  const { isStreamPaused, setStreamPaused } = useVoice();
  const isPaused = isStreamPaused(streamId, kind);

  const togglePause = useCallback(() => {
    setStreamPaused(streamId, kind, !isPaused);
  }, [setStreamPaused, streamId, kind, isPaused]);

  return { isPaused, togglePause };
};
