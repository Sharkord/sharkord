import { HexColorPicker } from 'react-colorful';
import { cn } from '../lib/utils';
import { Button, buttonVariants } from './button';
import { Input } from './input';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

type TColorProps = {
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  defaultValue?: string;
};

const Color = ({
  value,
  onChange,
  defaultValue = '#FFFFFF',
  error
}: TColorProps) => {
  return (
    <div className="flex flex-col">
      <Popover>
        <PopoverTrigger asChild>
          <div
            style={{ backgroundColor: value }}
            className={cn(
              'w-10 cursor-pointer',
              buttonVariants({ variant: 'outline' }),
              error && '!border-red-500'
            )}
          />
        </PopoverTrigger>
        <PopoverContent className="flex flex-col gap-2 w-fit h-fit p-2">
          <HexColorPicker color={value} onChange={onChange} />
          <Input value={value} onChange={(e) => onChange?.(e.target.value)} />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onChange?.(defaultValue)}
          >
            Reset
          </Button>
        </PopoverContent>
      </Popover>
      {error && <span className="text-sm text-red-500 mt-1">{error}</span>}
    </div>
  );
};

export { Color };
