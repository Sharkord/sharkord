import { useCallback, useRef } from 'react';

type TSwipeHandlers = {
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
};

type TSwipeGestureHandlers = {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
};

const useSwipeGestures = (handlers: TSwipeHandlers): TSwipeGestureHandlers => {
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    const swipeThreshold = 50; // minimum distance for swipe
    const diff = touchEndX.current - touchStartX.current;

    if (diff > swipeThreshold && handlers.onSwipeRight) {
      handlers.onSwipeRight();
    }

    if (diff < -swipeThreshold && handlers.onSwipeLeft) {
      handlers.onSwipeLeft();
    }
  }, [handlers]);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd
  };
};

export { useSwipeGestures };
