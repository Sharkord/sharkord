import { IconButton } from '@sharkord/ui';
import { Maximize, Minimize } from 'lucide-react';
import { memo, type RefObject, useCallback, useEffect, useState } from 'react';

type TFullscreenButtonProps = {
  containerRef: RefObject<HTMLDivElement | null>;
};

const FullscreenButton = memo(({ containerRef }: TFullscreenButtonProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [containerRef]);

  const handleToggle = useCallback(() => {
    if (!containerRef.current) return;

    if (document.fullscreenElement === containerRef.current) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  }, [containerRef]);

  return (
    <IconButton
      variant={isFullscreen ? 'default' : 'ghost'}
      icon={isFullscreen ? Minimize : Maximize}
      onClick={handleToggle}
      title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
      size="sm"
    />
  );
});

export { FullscreenButton };
