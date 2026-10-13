import { useHotkeyBindingInput } from '@/hooks/use-hotkey-binding-input';
import { HotkeyInput as BaseHotkeyInput } from '@sharkord/ui';
import { memo } from 'react';

type THotkeyInputProps = {
  actionId: string;
  className?: string;
};

const HotkeyInput = memo(({ actionId, className }: THotkeyInputProps) => {
  const input = useHotkeyBindingInput(actionId);

  return <BaseHotkeyInput {...input} className={className} />;
});

export { HotkeyInput };
