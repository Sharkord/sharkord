import { cn } from '@/lib/utils';
import { Check, type LucideIcon } from 'lucide-react';
import { memo, useCallback } from 'react';

type TStepperStep = {
  label: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
};

type TStepperOrientation = 'horizontal' | 'vertical';

type TStepperItemProps = {
  step: TStepperStep;
  index: number;
  current: number;
  isLast: boolean;
  orientation: TStepperOrientation;
  onStepClick?: (index: number) => void;
};

const StepperItem = memo(
  ({
    step,
    index,
    current,
    isLast,
    orientation,
    onStepClick
  }: TStepperItemProps) => {
    const done = index < current;
    const active = index === current;
    const vertical = orientation === 'vertical';
    const clickable = !!onStepClick && done;

    const handleClick = useCallback(
      () => onStepClick?.(index),
      [onStepClick, index]
    );

    let indicator: React.ReactNode = index + 1;

    if (done) {
      indicator = <Check className="h-4 w-4" />;
    } else if (step.icon) {
      const Icon = step.icon;

      indicator = <Icon className="h-4 w-4" />;
    }

    const connector = !isLast && (
      <span
        className={cn(
          'rounded',
          vertical ? 'min-h-4 w-0.5 flex-1' : 'h-0.5 min-w-4 flex-1',
          done ? 'bg-primary' : 'bg-border'
        )}
      />
    );

    const Trigger = clickable ? 'button' : 'div';

    return (
      <li
        aria-current={active ? 'step' : undefined}
        className={cn(
          'flex gap-2',
          vertical ? 'flex-row' : 'items-center',
          !isLast && !vertical && 'flex-1'
        )}
      >
        <div
          className={cn(
            'flex gap-2',
            vertical ? 'flex-col items-center' : 'items-center'
          )}
        >
          <Trigger
            {...(clickable && { type: 'button', onClick: handleClick })}
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors',
              (done || active) && 'border-primary',
              done && 'bg-primary text-primary-foreground',
              !done && !active && 'border-border text-muted-foreground',
              clickable && 'cursor-pointer hover:bg-primary/80'
            )}
          >
            {indicator}
          </Trigger>
          {vertical && connector}
        </div>
        <div className={cn('flex flex-col', vertical && !isLast && 'pb-4')}>
          <span
            className={cn(
              'text-sm',
              active ? 'font-medium' : 'text-muted-foreground'
            )}
          >
            {step.label}
          </span>
          {step.description && (
            <span className="text-xs text-muted-foreground">
              {step.description}
            </span>
          )}
        </div>
        {!vertical && connector}
      </li>
    );
  }
);
StepperItem.displayName = 'StepperItem';

type TStepperProps = {
  steps: TStepperStep[];
  current: number;
  orientation?: TStepperOrientation;
  onStepClick?: (index: number) => void;
  className?: string;
};

const Stepper = memo(
  ({
    steps,
    current,
    orientation = 'horizontal',
    onStepClick,
    className
  }: TStepperProps) => (
    <ol
      className={cn(
        'flex',
        orientation === 'vertical' ? 'flex-col' : 'items-center gap-2',
        className
      )}
    >
      {steps.map((step, index) => (
        <StepperItem
          key={index}
          step={step}
          index={index}
          current={current}
          isLast={index === steps.length - 1}
          orientation={orientation}
          onStepClick={onStepClick}
        />
      ))}
    </ol>
  )
);
Stepper.displayName = 'Stepper';

export { Stepper };
export type { TStepperOrientation, TStepperProps, TStepperStep };
