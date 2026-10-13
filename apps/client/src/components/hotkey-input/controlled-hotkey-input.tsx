import { useHotkeyInput } from '@/hooks/use-hotkey-input';
import { HotkeyInput as BaseHotkeyInput } from '@sharkord/ui';
import { memo } from 'react';

type TControlledHotkeyInputProps = {
  value?: string;
  onChange: (combo?: string) => void;
  findConflict: (combo: string) => string | undefined;
  error?: string;
  className?: string;
};

const ControlledHotkeyInput = memo(
  ({
    value,
    onChange,
    findConflict,
    error,
    className
  }: TControlledHotkeyInputProps) => {
    const input = useHotkeyInput({ onChange, findConflict });

    return (
      <BaseHotkeyInput
        {...input}
        value={value}
        error={error}
        className={className}
      />
    );
  }
);

export { ControlledHotkeyInput };
