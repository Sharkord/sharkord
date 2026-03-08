import { IconButton } from '@sharkord/ui';
import { Pin, PinOff } from 'lucide-react';
import { memo } from 'react';

type TPinButtonProps = {
  isPinned: boolean;
  handlePinToggle: () => void;
};

const PinButton = memo(({ isPinned, handlePinToggle }: TPinButtonProps) => {
  return (
    <IconButton
      variant={isPinned ? 'default' : 'ghost'}
      icon={isPinned ? PinOff : Pin}
      onClick={handlePinToggle}
      title={isPinned ? 'Unpin' : 'Pin'}
      size="sm"
    />
  );
});

export { PinButton };
