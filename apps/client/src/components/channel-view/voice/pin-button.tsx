import { IconButton } from '@sharkord/ui';
import { Pin, PinOff } from 'lucide-react';
import { memo } from 'react';

type TPinButtonProps = {
  isPinned: boolean;
  handlePinToggle: () => void;
  className?: string;
  size?: 'default' | 'xs' | 'sm' | 'lg' | 'xl';
};

const PinButton = memo(
  ({
    isPinned,
    handlePinToggle,
    className,
    size = 'default'
  }: TPinButtonProps) => {
    return (
      <IconButton
        variant={isPinned ? 'default' : 'ghost'}
        icon={isPinned ? PinOff : Pin}
        onClick={handlePinToggle}
        title={isPinned ? 'Unpin' : 'Pin'}
        size={size}
        className={className}
      />
    );
  }
);

export { PinButton };
