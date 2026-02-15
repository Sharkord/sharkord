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
  const touchStartY = useRef<number>(0);
  const touchEndY = useRef<number>(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchEndY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
    touchEndY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(() => {
    const swipeThreshold = 50; // minimum distance for swipe
    const diffX = touchEndX.current - touchStartX.current;
    const diffY = Math.abs(touchEndY.current - touchStartY.current);

    // ignore mostly vertical gestures and taps
    if (Math.abs(diffX) < swipeThreshold || Math.abs(diffX) <= diffY) {
      return;
    }

    if (diffX > 0 && handlers.onSwipeRight) {
      handlers.onSwipeRight();
    }

    if (diffX < 0 && handlers.onSwipeLeft) {
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
