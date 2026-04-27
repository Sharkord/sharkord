import { IconButton } from '@sharkord/ui';
import { Maximize, Minimize } from 'lucide-react';
import { memo } from 'react';

type TFullscreenButtonProps = {
  isFullscreen: boolean;
  handleToggleFullscreen: () => void;
  className?: string;
  size?: 'default' | 'xs' | 'sm' | 'lg' | 'xl';
};

const FullscreenButton = memo(
  ({
    isFullscreen,
    handleToggleFullscreen,
    className,
    size = 'default'
  }: TFullscreenButtonProps) => {
    return (
      <IconButton
        variant={isFullscreen ? 'default' : 'ghost'}
        icon={isFullscreen ? Minimize : Maximize}
        onClick={handleToggleFullscreen}
        title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        size={size}
        className={className}
      />
    );
  }
);

FullscreenButton.displayName = 'FullscreenButton';

export { FullscreenButton };
