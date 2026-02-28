import { Button, Input, Slider } from '@sharkord/ui';
import { memo, useCallback, type ReactNode } from 'react';
import { FILE_SIZE_STEP, MEGABYTE } from './presets';

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(value, max));

type TStorageControlPreset = {
  label: string;
  value: number;
};

type TStorageSizeControlProps = {
  value: number;
  min: number;
  max: number;
  disabled?: boolean;
  onChange: (value: number) => void;
  preview: ReactNode;
  presets: TStorageControlPreset[];
};

const StorageSizeControl = memo(
  ({
    value,
    min,
    max,
    disabled,
    onChange,
    preview,
    presets
  }: TStorageSizeControlProps) => {
    const valueInMb = Math.round(Number(value) / MEGABYTE);

    const onChangeHandler = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const nextValue = Number(e.target.value);

        if (!Number.isFinite(nextValue)) {
          return;
        }

        onChange(clamp(nextValue * MEGABYTE, min, max));
      },
      [onChange, min, max]
    );

    return (
      <div className="max-w-150 space-y-2">
        <Slider
          value={[Number(value)]}
          max={max}
          min={min}
          step={FILE_SIZE_STEP}
          disabled={disabled}
          onValueChange={(values) => onChange(clamp(values[0], min, max))}
          rightSlot={<span className="text-sm">{preview}</span>}
        />

        <div className="flex justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              className="w-28"
              min={Math.ceil(min / MEGABYTE)}
              max={Math.floor(max / MEGABYTE)}
              step={1}
              value={valueInMb}
              disabled={disabled}
              onChange={onChangeHandler}
            />
            <span className="text-xs text-muted-foreground">MB</span>
          </div>
          <div className="flex items-center gap-2">
            {presets.map((preset) => (
              <Button
                key={preset.value}
                size="sm"
                variant="outline"
                disabled={disabled}
                onClick={() => onChange(preset.value)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    );
  }
);

export { StorageSizeControl };
