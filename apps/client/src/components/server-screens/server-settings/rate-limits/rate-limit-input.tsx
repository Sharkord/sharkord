import {
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_MAX_WINDOW_MS,
  RATE_LIMIT_MIN_WINDOW_MS,
  type TRateLimit
} from '@sharkord/shared';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { LimitNumberInput } from './limit-number-input';

type TRateLimitInputProps = {
  value: TRateLimit;
  minRequests?: number;
  disabled?: boolean;
  onChange: (value: TRateLimit) => void;
};

const RateLimitInput = memo(
  ({ value, minRequests = 1, disabled, onChange }: TRateLimitInputProps) => {
    const { t } = useTranslation('settings');

    const onRequestsChange = useCallback(
      (maxRequests: number) => {
        onChange({ ...value, maxRequests: Math.round(maxRequests) });
      },
      [value, onChange]
    );

    const onWindowChange = useCallback(
      (seconds: number) => {
        onChange({ ...value, windowMs: Math.round(seconds) * 1000 });
      },
      [value, onChange]
    );

    return (
      <div className="flex items-center gap-2">
        <LimitNumberInput
          min={minRequests}
          max={RATE_LIMIT_MAX_REQUESTS}
          value={value.maxRequests}
          disabled={disabled}
          onChange={onRequestsChange}
        />
        <span className="text-xs text-muted-foreground">
          {t('rateLimitRequestsEvery')}
        </span>
        <LimitNumberInput
          min={RATE_LIMIT_MIN_WINDOW_MS / 1000}
          max={RATE_LIMIT_MAX_WINDOW_MS / 1000}
          value={value.windowMs / 1000}
          disabled={disabled}
          onChange={onWindowChange}
        />
        <span className="text-xs text-muted-foreground">
          {t('rateLimitSecondsUnit')}
        </span>
      </div>
    );
  }
);

export { RateLimitInput };
