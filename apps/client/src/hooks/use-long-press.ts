import { useCallback, useEffect, useRef } from 'react';

const LONG_PRESS_MS = 450;

// touch only: a mouse already has hover and right click for the same job
export const useLongPress = (onLongPress: () => void) => {
  const timeoutRef = useRef<number | undefined>(undefined);

  const cancel = useCallback(() => {
    window.clearTimeout(timeoutRef.current);
    timeoutRef.current = undefined;
  }, []);

  const onTouchStart = useCallback(() => {
    cancel();
    timeoutRef.current = window.setTimeout(onLongPress, LONG_PRESS_MS);
  }, [cancel, onLongPress]);

  useEffect(() => cancel, [cancel]);

  return {
    onTouchStart,
    onTouchMove: cancel,
    onTouchEnd: cancel,
    onTouchCancel: cancel
  };
};
