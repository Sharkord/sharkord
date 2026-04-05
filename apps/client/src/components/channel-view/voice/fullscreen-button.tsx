import { IconButton } from '@sharkord/ui';
import { Maximize, Minimize } from 'lucide-react';
import { memo } from 'react';

type TFullscreenButtonProps = {
  isFullscreen: boolean;
  handleToggleFullscreen: () => void;
};

const FullscreenButton = memo(
  ({ isFullscreen, handleToggleFullscreen }: TFullscreenButtonProps) => {
    return (
      <IconButton
        variant={isFullscreen ? 'default' : 'ghost'}
        icon={isFullscreen ? Minimize : Maximize}
        onClick={handleToggleFullscreen}
        title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        size="sm"
      />
    );
  }
);

FullscreenButton.displayName = 'FullscreenButton';

export { FullscreenButton };
