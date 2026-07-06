import { PencilIcon } from 'lucide-react';
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

const ColorPicker = ({
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
              'w-12 h-4 cursor-pointer relative',
              buttonVariants({ variant: 'outline' }),
              error && 'border-red-500!'
            )}
          >
            <PencilIcon className="size-3 absolute top-2 right-2" fill="#fff" />
          </div>
        </PopoverTrigger>
        <PopoverContent className="flex flex-col gap-2 w-fit h-fit p-2 rounded-2xl">
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

export { ColorPicker };
