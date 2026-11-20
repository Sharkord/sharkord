import {
  STORAGE_MAX_MEDIA_PROXY_CACHE_SECONDS,
  STORAGE_MAX_MEDIA_PROXY_MAX_REDIRECTS,
  STORAGE_MAX_MEDIA_PROXY_MAX_SIZE,
  STORAGE_MAX_MEDIA_PROXY_TIMEOUT_SECONDS,
  STORAGE_MIN_MEDIA_PROXY_CACHE_SECONDS,
  STORAGE_MIN_MEDIA_PROXY_MAX_REDIRECTS,
  STORAGE_MIN_MEDIA_PROXY_MAX_SIZE,
  STORAGE_MIN_MEDIA_PROXY_TIMEOUT_SECONDS,
  type TStorageSettings
} from '@sharkord/shared';
import { Group, Switch } from '@sharkord/ui';
import { filesize } from 'filesize';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { NumberInput } from '../number-input';
import { MEDIA_PROXY_MAX_SIZE_PRESETS } from './presets';
import { StorageSizeControl } from './storage-size-control';

const HOUR = 60 * 60;

type TUnitNumberInputProps = {
  value: number;
  min: number;
  max: number;
  unit: string;
  disabled: boolean;
  onChange: (value: number) => void;
};

const UnitNumberInput = memo(
  ({ value, min, max, unit, disabled, onChange }: TUnitNumberInputProps) => (
    <div className="flex items-center gap-2">
      <NumberInput
        className="w-28"
        min={min}
        max={max}
        step={1}
        value={value}
        disabled={disabled}
        onChange={onChange}
      />
      <span className="text-xs text-muted-foreground">{unit}</span>
    </div>
  )
);

type TMediaProxySettingsProps = {
  values: TStorageSettings;
  onChange: <K extends keyof TStorageSettings>(
    key: K,
    value: TStorageSettings[K]
  ) => void;
};

const MediaProxySettings = memo(
  ({ values, onChange }: TMediaProxySettingsProps) => {
    const { t } = useTranslation('settings');
    const disabled = !values.storageMediaProxyEnabled;

    const maxSizeLabel = useMemo(
      () =>
        filesize(Number(values.storageMediaProxyMaxSize), {
          standard: 'jedec'
        }),
      [values.storageMediaProxyMaxSize]
    );

    const onEnabledChange = useCallback(
      (checked: boolean) => onChange('storageMediaProxyEnabled', checked),
      [onChange]
    );

    const onMaxSizeChange = useCallback(
      (value: number) => onChange('storageMediaProxyMaxSize', value),
      [onChange]
    );

    const onTimeoutChange = useCallback(
      (value: number) => onChange('storageMediaProxyTimeoutSeconds', value),
      [onChange]
    );

    const onCacheChange = useCallback(
      (hours: number) =>
        onChange('storageMediaProxyCacheSeconds', hours * HOUR),
      [onChange]
    );

    const onRedirectsChange = useCallback(
      (value: number) => onChange('storageMediaProxyMaxRedirects', value),
      [onChange]
    );

    return (
      <>
        <Group label={t('mediaProxyLabel')} description={t('mediaProxyDesc')}>
          <Switch
            checked={!!values.storageMediaProxyEnabled}
            onCheckedChange={onEnabledChange}
          />
        </Group>

        <Group
          label={t('mediaProxyMaxSizeLabel')}
          description={t('mediaProxyMaxSizeDesc')}
        >
          <StorageSizeControl
            value={Number(values.storageMediaProxyMaxSize)}
            min={STORAGE_MIN_MEDIA_PROXY_MAX_SIZE}
            max={STORAGE_MAX_MEDIA_PROXY_MAX_SIZE}
            disabled={disabled}
            onChange={onMaxSizeChange}
            preview={maxSizeLabel}
            presets={MEDIA_PROXY_MAX_SIZE_PRESETS}
          />
        </Group>

        <Group
          label={t('mediaProxyTimeoutLabel')}
          description={t('mediaProxyTimeoutDesc')}
        >
          <UnitNumberInput
            value={Number(values.storageMediaProxyTimeoutSeconds)}
            min={STORAGE_MIN_MEDIA_PROXY_TIMEOUT_SECONDS}
            max={STORAGE_MAX_MEDIA_PROXY_TIMEOUT_SECONDS}
            unit={t('rateLimitSecondsUnit')}
            disabled={disabled}
            onChange={onTimeoutChange}
          />
        </Group>

        <Group
          label={t('mediaProxyCacheLabel')}
          description={t('mediaProxyCacheDesc')}
        >
          <UnitNumberInput
            value={Math.round(
              Number(values.storageMediaProxyCacheSeconds) / HOUR
            )}
            min={Math.ceil(STORAGE_MIN_MEDIA_PROXY_CACHE_SECONDS / HOUR)}
            max={Math.floor(STORAGE_MAX_MEDIA_PROXY_CACHE_SECONDS / HOUR)}
            unit={t('mediaProxyHoursUnit')}
            disabled={disabled}
            onChange={onCacheChange}
          />
        </Group>

        <Group
          label={t('mediaProxyRedirectsLabel')}
          description={t('mediaProxyRedirectsDesc')}
        >
          <UnitNumberInput
            value={Number(values.storageMediaProxyMaxRedirects)}
            min={STORAGE_MIN_MEDIA_PROXY_MAX_REDIRECTS}
            max={STORAGE_MAX_MEDIA_PROXY_MAX_REDIRECTS}
            unit={t('mediaProxyRedirectsUnit')}
            disabled={disabled}
            onChange={onRedirectsChange}
          />
        </Group>
      </>
    );
  }
);

export { MediaProxySettings };
