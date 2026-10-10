import { Input } from '@sharkord/ui';
import { memo, useCallback, useState } from 'react';

type TNumberInputProps = Omit<
  React.ComponentProps<typeof Input>,
  'value' | 'onChange' | 'type'
> & {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
};

const NumberInput = memo(
  ({ value, min, max, onChange, onBlur, ...props }: TNumberInputProps) => {
    const [draft, setDraft] = useState<string | undefined>();

    const onChangeHandler = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const nextDraft = e.target.value;
        const nextValue = Number(nextDraft);

        setDraft(nextDraft);

        if (nextDraft !== '' && nextValue >= min && nextValue <= max) {
          onChange(nextValue);
        }
      },
      [onChange, min, max]
    );

    const onBlurHandler = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        if (draft !== undefined) {
          const nextValue = Number(draft);
          const safeValue =
            draft === '' || !Number.isFinite(nextValue) ? min : nextValue;

          onChange(Math.max(min, Math.min(safeValue, max)));
          setDraft(undefined);
        }

        onBlur?.(e);
      },
      [draft, onChange, onBlur, min, max]
    );

    return (
      <Input
        {...props}
        type="number"
        min={min}
        max={max}
        value={draft ?? value}
        onChange={onChangeHandler}
        onBlur={onBlurHandler}
      />
    );
  }
);

export { NumberInput };
