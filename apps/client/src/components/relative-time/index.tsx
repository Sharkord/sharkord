import { useDateLocale } from '@/hooks/use-date-locale';
import {
  format,
  formatDistanceToNow,
  isWithinInterval,
  subHours,
  type Locale
} from 'date-fns';
import { memo, useMemo, useSyncExternalStore, type ReactNode } from 'react';

const ONE_MINUTE = 60_000;
const ONE_HOUR = 60 * ONE_MINUTE;
const ONE_DAY = 24 * ONE_HOUR;
const ONE_WEEK = 7 * ONE_DAY;
const DEFAULT_FORMAT = 'PPpp'; // eg: 12 August 2022, 14:30

type TRelativeTimeProps = {
  date: Date | string;
  compact?: boolean;
  children: (relativeTime: string) => ReactNode;
};

const getFormattedTime = (d: Date, dateLocale: Locale): string => {
  const now = new Date();
  const twentyFourHoursAgo = subHours(now, 24);

  // past 24 hours show relative time, eg: 5 minutes ago
  if (isWithinInterval(d, { start: twentyFourHoursAgo, end: now })) {
    return formatDistanceToNow(d, { addSuffix: true, locale: dateLocale });
  }

  return format(d, DEFAULT_FORMAT, { locale: dateLocale });
};

const formatUnit = (value: number, unit: string, localeCode: string) =>
  new Intl.NumberFormat(localeCode, {
    style: 'unit',
    unit,
    unitDisplay: 'narrow'
  }).format(value);

const getCompactTime = (d: Date, dateLocale: Locale): string => {
  const localeCode = dateLocale.code ?? 'en-US';
  const elapsed = Math.max(0, Date.now() - d.getTime());

  if (elapsed < ONE_HOUR) {
    return formatUnit(
      Math.max(1, Math.floor(elapsed / ONE_MINUTE)),
      'minute',
      localeCode
    );
  }

  if (elapsed < ONE_DAY) {
    return formatUnit(Math.floor(elapsed / ONE_HOUR), 'hour', localeCode);
  }

  if (elapsed < ONE_WEEK) {
    return formatUnit(Math.floor(elapsed / ONE_DAY), 'day', localeCode);
  }

  const isThisYear = d.getFullYear() === new Date().getFullYear();

  return new Intl.DateTimeFormat(localeCode, {
    month: 'short',
    day: 'numeric',
    year: isThisYear ? undefined : 'numeric'
  }).format(d);
};

const isRecent = (date: Date): boolean => {
  const elapsed = Date.now() - date.getTime();

  return elapsed >= 0 && elapsed <= ONE_DAY;
};

const tickListeners = new Set<() => void>();
let ticker: ReturnType<typeof setInterval> | undefined;
let tick = 0;

const subscribeToTicker = (listener: () => void) => {
  tickListeners.add(listener);

  if (!ticker) {
    ticker = setInterval(() => {
      tick += 1;
      tickListeners.forEach((tickListener) => tickListener());
    }, ONE_MINUTE);
  }

  return () => {
    tickListeners.delete(listener);

    if (tickListeners.size === 0) {
      clearInterval(ticker);

      ticker = undefined;
    }
  };
};

const subscribeToNothing = () => () => {};

const RelativeTime = memo(
  ({ date, compact = false, children }: TRelativeTimeProps) => {
    const dateLocale = useDateLocale();
    const parsedDate = useMemo(
      () => (typeof date === 'string' ? new Date(date) : date),
      [date]
    );

    const getSnapshot = useMemo(() => {
      const formatTime = compact ? getCompactTime : getFormattedTime;
      let formattedAt = -1;
      let formatted = '';

      return () => {
        if (formattedAt !== tick) {
          formattedAt = tick;
          formatted = formatTime(parsedDate, dateLocale);
        }

        return formatted;
      };
    }, [compact, parsedDate, dateLocale]);

    const relativeTime = useSyncExternalStore(
      isRecent(parsedDate) ? subscribeToTicker : subscribeToNothing,
      getSnapshot
    );

    return children(relativeTime);
  }
);

export { RelativeTime };
