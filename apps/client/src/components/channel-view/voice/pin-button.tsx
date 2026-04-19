import { IconButton } from '@sharkord/ui';
import { Pin, PinOff } from 'lucide-react';
import { memo } from 'react';

type TPinButtonProps = {
  isPinned: boolean;
  handlePinToggle: () => void;
  className?: string;
};

const PinButton = memo(
  ({ isPinned, handlePinToggle, className }: TPinButtonProps) => {
    return (
      <IconButton
        variant={isPinned ? 'default' : 'ghost'}
        icon={isPinned ? PinOff : Pin}
        onClick={handlePinToggle}
        title={isPinned ? 'Unpin' : 'Pin'}
        size="sm"
        className={className}
      />
    );
  }
);

export { PinButton };
