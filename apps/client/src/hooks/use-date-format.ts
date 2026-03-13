import {
  getLocalStorageItem,
  getLocalStorageItemBool,
  LocalStorageKey,
  setLocalStorageItem,
  setLocalStorageItemBool
} from '@/helpers/storage';
import { useCallback, useMemo, useSyncExternalStore } from 'react';

// Default formats
const DEFAULT_DATE_FORMAT = 'PP';
const DEFAULT_TIME_FORMAT = 'p';

// Storage event listener
const subscribe = (callback: () => void) => {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
};

// Get snapshot for date format
const getDateFormatSnapshot = () => {
  return (
    getLocalStorageItem(LocalStorageKey.DATE_FORMAT) ?? DEFAULT_DATE_FORMAT
  );
};

// Get snapshot for time format
const getTimeFormatSnapshot = () => {
  return (
    getLocalStorageItem(LocalStorageKey.TIME_FORMAT) ?? DEFAULT_TIME_FORMAT
  );
};

// Get snapshot for prefer absolute time
const getPreferAbsoluteTimeSnapshot = () => {
  return getLocalStorageItemBool(LocalStorageKey.PREFER_ABSOLUTE_TIME, false);
};

export const useDateFormat = () => {
  const dateFormat = useSyncExternalStore(
    subscribe,
    getDateFormatSnapshot,
    getDateFormatSnapshot
  );

  const timeFormat = useSyncExternalStore(
    subscribe,
    getTimeFormatSnapshot,
    getTimeFormatSnapshot
  );

  const preferAbsoluteTime = useSyncExternalStore(
    subscribe,
    getPreferAbsoluteTimeSnapshot,
    getPreferAbsoluteTimeSnapshot
  );

  const setDateFormat = useCallback((format: string) => {
    setLocalStorageItem(LocalStorageKey.DATE_FORMAT, format);
    window.dispatchEvent(new Event('storage'));
  }, []);

  const setTimeFormat = useCallback((format: string) => {
    setLocalStorageItem(LocalStorageKey.TIME_FORMAT, format);
    window.dispatchEvent(new Event('storage'));
  }, []);

  const setPreferAbsoluteTime = useCallback((prefer: boolean) => {
    setLocalStorageItemBool(LocalStorageKey.PREFER_ABSOLUTE_TIME, prefer);
    window.dispatchEvent(new Event('storage'));
  }, []);

  // Combined date-time format (for timestamps)
  const dateTimeFormat = useMemo(() => {
    return `${dateFormat} ${timeFormat}`;
  }, [dateFormat, timeFormat]);

  return {
    dateFormat,
    timeFormat,
    dateTimeFormat,
    preferAbsoluteTime,
    setDateFormat,
    setTimeFormat,
    setPreferAbsoluteTime
  };
};
