import { useDateFormat } from '@/hooks/use-date-format';
import { useDateLocale } from '@/hooks/use-date-locale';
import {
  format,
  formatDistanceToNow,
  isFuture,
  isWithinInterval,
  subHours,
  type Locale
} from 'date-fns';
import { memo, useEffect, useMemo, useState, type ReactNode } from 'react';

const ONE_MINUTE = 60_000;
const ONE_HOUR = 60 * ONE_MINUTE;

type THoverProps = {
  onMouseEnter: () => void;
  onMouseLeave: () => void;
};

type TRelativeTimeProps = {
  date: Date | string;
  interval?: number;
  children: (relativeTime: string, hoverProps: THoverProps) => ReactNode;
};

const getFormattedTime = (
  d: Date,
  dateLocale: Locale,
  dateTimeFormat: string,
  preferAbsoluteTime: boolean
): string => {
  // If user prefers absolute time, always show absolute format
  if (preferAbsoluteTime) {
    return format(d, dateTimeFormat, { locale: dateLocale });
  }

  const now = new Date();
  const twentyFourHoursAgo = subHours(now, 24);

  // past 24 hours show relative time, eg: 5 minutes ago
  if (isWithinInterval(d, { start: twentyFourHoursAgo, end: now })) {
    return formatDistanceToNow(d, { addSuffix: true, locale: dateLocale });
  }

  return format(d, dateTimeFormat, { locale: dateLocale });
};

const getUpdateInterval = (date: Date): number | null => {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();

  // future dates or absolute dates don't need updates
  if (isFuture(date) || diffInMs > 24 * ONE_HOUR) {
    return null; // no updates needed
  }

  // less than 1 hour, rerender every minute
  if (diffInMs < ONE_HOUR) {
    return ONE_MINUTE;
  }

  // 1-24 hours, rerender every hour
  return ONE_HOUR;
};

const RelativeTime = memo(
  ({ date, interval, children }: TRelativeTimeProps) => {
    const dateLocale = useDateLocale();
    const { dateTimeFormat, preferAbsoluteTime } = useDateFormat();
    const parsedDate = useMemo(
      () => (typeof date === 'string' ? new Date(date) : date),
      [date]
    );

    const [, setCounter] = useState(0);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
      const updateInterval = interval ?? getUpdateInterval(parsedDate);

      // if no update interval is needed, don't set up a timer
      if (updateInterval === null) {
        return;
      }

      const timer = setInterval(() => {
        // force re-render to update the relative time display
        setCounter((prev) => prev + 1);
      }, updateInterval);

      return () => clearInterval(timer);
    }, [interval, parsedDate]);

    const shouldShowAbsolute = preferAbsoluteTime || isHovered;
    const displayTime = useMemo(
      () =>
        getFormattedTime(
          parsedDate,
          dateLocale,
          dateTimeFormat,
          shouldShowAbsolute
        ),
      [parsedDate, dateLocale, dateTimeFormat, shouldShowAbsolute]
    );

    const hoverProps: THoverProps = useMemo(
      () => ({
        onMouseEnter: () => setIsHovered(true),
        onMouseLeave: () => setIsHovered(false)
      }),
      []
    );

    return children(displayTime, hoverProps);
  }
);

RelativeTime.displayName = 'RelativeTime';

export { RelativeTime };
