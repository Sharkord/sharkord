import { useMemo } from 'react';

/**
 * Checks whether the current browser exposes the screen capture API.
 * Support varies by browser and OS, so detect it at runtime.
 */
const useScreenShareSupport = () => {
  const isSupported = useMemo(() => {
    if (typeof window === 'undefined') return false;
    if (!navigator.mediaDevices) return false;

    return typeof navigator.mediaDevices.getDisplayMedia === 'function';
  }, []);

  return { isScreenShareSupported: isSupported };
};

export { useScreenShareSupport };
