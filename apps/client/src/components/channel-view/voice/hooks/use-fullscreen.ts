import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject
} from 'react';

const IDLE_TIMEOUT = 3000;

export const useFullscreen = (containerRef: RefObject<HTMLElement | null>) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isOverlayVisible, setIsOverlayVisible] = useState(true);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const resetIdleTimer = useCallback(() => {
    setIsOverlayVisible(true);
    clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(
      () => setIsOverlayVisible(false),
      IDLE_TIMEOUT
    );
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const entered = document.fullscreenElement === containerRef.current;
      setIsFullscreen(entered);

      if (entered) {
        resetIdleTimer();
      } else {
        clearTimeout(idleTimerRef.current);
        setIsOverlayVisible(true);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      clearTimeout(idleTimerRef.current);
    };
  }, [containerRef, resetIdleTimer]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !isFullscreen) return;

    const onActivity = () => resetIdleTimer();

    el.addEventListener('mousemove', onActivity);
    el.addEventListener('touchstart', onActivity);
    el.addEventListener('keydown', onActivity);

    return () => {
      el.removeEventListener('mousemove', onActivity);
      el.removeEventListener('touchstart', onActivity);
      el.removeEventListener('keydown', onActivity);
    };
  }, [isFullscreen, containerRef, resetIdleTimer]);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (document.fullscreenElement === containerRef.current) {
        await document.exitFullscreen();
      } else {
        await containerRef.current.requestFullscreen();
      }
    } catch {
      console.warn('Fullscreen toggle failed');
    }
  }, [containerRef]);

  useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen, toggleFullscreen]);

  const handleDoubleClick = useCallback(() => {
    toggleFullscreen();
  }, [toggleFullscreen]);

  return {
    isFullscreen,
    isOverlayVisible,
    toggleFullscreen,
    handleDoubleClick
  };
};
