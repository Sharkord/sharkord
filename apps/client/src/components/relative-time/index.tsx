import { useDateLocale } from '@/hooks/use-date-locale';
import {
  format,
  formatDistanceToNow,
  isFuture,
  isWithinInterval,
  subHours
} from 'date-fns';
import { memo, type ReactNode, useEffect, useMemo, useState } from 'react';

const ONE_MINUTE = 60_000;
const ONE_HOUR = 60 * ONE_MINUTE;
const DEFAULT_FORMAT = 'PPpp';

type TRelativeTimeProps = {
  date: Date | string;
  interval?: number;
  children: (relativeTime: string) => ReactNode;
};

const getUpdateInterval = (date: Date): number | null => {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();

  if (isFuture(date) || diffInMs > 24 * ONE_HOUR) {
    return null;
  }

  if (diffInMs < ONE_HOUR) {
    return ONE_MINUTE;
  }

  return ONE_HOUR;
};

const RelativeTime = memo(
  ({ date, interval, children }: TRelativeTimeProps) => {
    const dateLocale = useDateLocale();
    const parsedDate = useMemo(
      () => (typeof date === 'string' ? new Date(date) : date),
      [date]
    );

    const [, setCounter] = useState(0);

    useEffect(() => {
      const updateInterval = interval ?? getUpdateInterval(parsedDate);

      if (updateInterval === null) {
        return;
      }

      const timer = setInterval(() => {
        setCounter((prev) => prev + 1);
      }, updateInterval);

      return () => clearInterval(timer);
    }, [interval, parsedDate]);

    const getFormattedTime = (d: Date): string => {
      const now = new Date();
      const twentyFourHoursAgo = subHours(now, 24);

      if (isWithinInterval(d, { start: twentyFourHoursAgo, end: now })) {
        return formatDistanceToNow(d, { addSuffix: true, locale: dateLocale });
      }

      return format(d, DEFAULT_FORMAT, { locale: dateLocale });
    };

    return children(getFormattedTime(parsedDate));
  }
);

export { RelativeTime };
