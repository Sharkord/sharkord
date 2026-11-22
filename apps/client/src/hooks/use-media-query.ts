import { useCallback, useSyncExternalStore } from 'react';

// mirrors tailwind's default breakpoints and pointer variants, for behaviour css alone
// cannot switch
export const MEDIA_QUERY = {
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
  finePointer: '(pointer: fine)'
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
