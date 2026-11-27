import { useEffect, type RefObject } from 'react';

export const useTouchOutside = (
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
  onTouchOutside: () => void
) => {
  useEffect(() => {
    if (!enabled) return;

    const onTouchStart = (event: TouchEvent) => {
      const target = event.target as Node;
      const isInside = ref.current?.contains(target);
      const isInsidePortal = (target as Element).closest?.(
        '[data-radix-popper-content-wrapper]'
      );

      if (isInside || isInsidePortal) return;

      onTouchOutside();
    };

    document.addEventListener('touchstart', onTouchStart);

    return () => document.removeEventListener('touchstart', onTouchStart);
  }, [ref, enabled, onTouchOutside]);
};
