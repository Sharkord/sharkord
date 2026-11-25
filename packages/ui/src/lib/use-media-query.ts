import { useCallback, useSyncExternalStore } from 'react';

// mirrors tailwind's default breakpoints
export const MEDIA_QUERY = {
  mobile: '(max-width: 639px)',
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
  finePointer: '(pointer: fine)',
  coarsePointer: '(pointer: coarse)'
} as const;

export const useMediaQuery = (query: string) => {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mediaQueryList = window.matchMedia(query);

      mediaQueryList.addEventListener('change', onChange);

      return () => mediaQueryList.removeEventListener('change', onChange);
    },
    [query]
  );

  const getSnapshot = useCallback(() => {
    const mediaQueryList = window.matchMedia(query);

    return mediaQueryList.matches;
  }, [query]);

  return useSyncExternalStore(subscribe, getSnapshot);
};
