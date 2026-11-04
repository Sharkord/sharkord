import {
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_MAX_WINDOW_MS,
  RATE_LIMIT_MIN_WINDOW_MS,
  type TRateLimiters
} from '@sharkord/shared';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { LimitNumberInput } from './limit-number-input';

type TLoginLockout = TRateLimiters['loginLockout'];

type TLoginLockoutInputProps = {
  value: TLoginLockout;
  disabled: boolean;
  onChange: (value: TLoginLockout) => void;
};

const MINUTE_MS = 60_000;
const MIN_MINUTES = Math.ceil(RATE_LIMIT_MIN_WINDOW_MS / MINUTE_MS);
const MAX_MINUTES = Math.floor(RATE_LIMIT_MAX_WINDOW_MS / MINUTE_MS);

type TLabelledInputProps = {
  label: string;
  unit: string;
  min: number;
  max: number;
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
};

const LabelledInput = memo(
  ({
    label,
    unit,
    min,
    max,
    value,
    disabled,
    onChange
  }: TLabelledInputProps) => (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <LimitNumberInput
          min={min}
          max={max}
          value={value}
          disabled={disabled}
          onChange={onChange}
        />
        <span className="text-xs text-muted-foreground">{unit}</span>
      </div>
    </div>
  )
);

const LoginLockoutInput = memo(
  ({ value, disabled, onChange }: TLoginLockoutInputProps) => {
    const { t } = useTranslation('settings');

    const onMaxFailuresChange = useCallback(
      (maxFailures: number) => {
        onChange({ ...value, maxFailures: Math.round(maxFailures) });
      },
      [value, onChange]
    );

    const onWindowChange = useCallback(
      (minutes: number) => {
        onChange({ ...value, windowMs: Math.round(minutes) * MINUTE_MS });
      },
      [value, onChange]
    );

    const onBlockChange = useCallback(
      (minutes: number) => {
        onChange({ ...value, blockMs: Math.round(minutes) * MINUTE_MS });
      },
      [value, onChange]
    );

    const onMaxBlockChange = useCallback(
      (minutes: number) => {
        onChange({ ...value, maxBlockMs: Math.round(minutes) * MINUTE_MS });
      },
      [value, onChange]
    );

    return (
      <div className="grid grid-cols-2 gap-4 max-w-150">
        <LabelledInput
          label={t('loginLockoutMaxFailuresLabel')}
          unit={t('loginLockoutAttemptsUnit')}
          min={1}
          max={RATE_LIMIT_MAX_REQUESTS}
          value={value.maxFailures}
          disabled={disabled}
          onChange={onMaxFailuresChange}
        />
        <LabelledInput
          label={t('loginLockoutWindowLabel')}
          unit={t('rateLimitMinutesUnit')}
          min={MIN_MINUTES}
          max={MAX_MINUTES}
          value={value.windowMs / MINUTE_MS}
          disabled={disabled}
          onChange={onWindowChange}
        />
        <LabelledInput
          label={t('loginLockoutBlockLabel')}
          unit={t('rateLimitMinutesUnit')}
          min={MIN_MINUTES}
          max={MAX_MINUTES}
          value={value.blockMs / MINUTE_MS}
          disabled={disabled}
          onChange={onBlockChange}
        />
        <LabelledInput
          label={t('loginLockoutMaxBlockLabel')}
          unit={t('rateLimitMinutesUnit')}
          min={MIN_MINUTES}
          max={MAX_MINUTES}
          value={value.maxBlockMs / MINUTE_MS}
          disabled={disabled}
          onChange={onMaxBlockChange}
        />
      </div>
    );
  }
);

export { LoginLockoutInput };
