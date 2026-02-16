import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { memo } from 'react';

type TIconComponent = React.ComponentType<{
  size?: number;
  className?: string;
}>;

type TControlToggleButtonProps = {
  enabled: boolean;
  enabledLabel: string;
  disabledLabel: string;
  enabledIcon: TIconComponent;
  disabledIcon: TIconComponent;

  enabledClassName: string;
  disabledClassName?: string;

  onClick: () => void;
  disabled?: boolean;
};

const ControlToggleButton = memo(
  ({
    enabled,
    enabledLabel,
    disabledLabel,
    enabledIcon: EnabledIcon,
    disabledIcon: DisabledIcon,
    enabledClassName,
    disabledClassName,
    onClick,
    disabled
  }: TControlToggleButtonProps) => {
    const label = enabled ? enabledLabel : disabledLabel;

    return (
      <Tooltip content={label}>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'rounded-md h-10 w-10 transition-all duration-200',
            enabled
              ? enabledClassName
              : (disabledClassName ?? 'hover:bg-muted/60'),
            disabled && 'opacity-60 hover:bg-transparent'
          )}
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
        >
          {enabled ? <EnabledIcon size={22} /> : <DisabledIcon size={22} />}
        </Button>
      </Tooltip>
    );
  }
);

ControlToggleButton.displayName = 'ControlToggleButton';

export { ControlToggleButton };
export type { TControlToggleButtonProps };
