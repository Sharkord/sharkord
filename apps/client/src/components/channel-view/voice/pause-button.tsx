import type { TPausableStreamKind } from '@sharkord/shared';
import { IconButton, type TIconButtonSize } from '@sharkord/ui';
import { Pause, Play } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useStreamPause } from './hooks/use-stream-pause';

type TPauseButtonProps = {
  streamId: number;
  kind: TPausableStreamKind;
  className?: string;
  size?: TIconButtonSize;
};

const PauseButton = memo(
  ({ streamId, kind, className, size = 'default' }: TPauseButtonProps) => {
    const { t } = useTranslation('common');
    const { isPaused, togglePause } = useStreamPause(streamId, kind);

    return (
      <IconButton
        variant={isPaused ? 'primary' : 'ghost'}
        icon={isPaused ? Play : Pause}
        onClick={togglePause}
        title={isPaused ? t('resumeStream') : t('pauseStream')}
        size={size}
        className={className}
      />
    );
  }
);

export { PauseButton };
