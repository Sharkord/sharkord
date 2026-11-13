import type { TPausableStreamKind } from '@sharkord/shared';
import { Button } from '@sharkord/ui';
import { Play } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useStreamPause } from './hooks/use-stream-pause';

type TPausedStreamOverlayProps = {
  streamId: number;
  kind: TPausableStreamKind;
};

const PausedStreamOverlay = memo(
  ({ streamId, kind }: TPausedStreamOverlayProps) => {
    const { t } = useTranslation('common');
    const { isPaused, togglePause } = useStreamPause(streamId, kind);

    if (!isPaused) return null;

    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black text-white">
        <p className="text-sm text-white/70">{t('streamPaused')}</p>
        <Button size="sm" variant="secondary" onClick={togglePause}>
          <Play />
          {t('resumeStream')}
        </Button>
      </div>
    );
  }
);

export { PausedStreamOverlay };
