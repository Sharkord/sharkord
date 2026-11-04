import { memo, type ComponentProps } from 'react';
import { NumberInput } from '../number-input';

type TLimitNumberInputProps = Omit<
  ComponentProps<typeof NumberInput>,
  'className' | 'step'
>;

const LimitNumberInput = memo((props: TLimitNumberInputProps) => (
  <div className="w-24 shrink-0">
    <NumberInput className="h-8" step={1} {...props} />
  </div>
));

export { LimitNumberInput };
