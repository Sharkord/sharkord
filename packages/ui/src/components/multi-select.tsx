import { ChevronDown } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { cn } from '../lib/utils';
import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger
} from './dropdown-menu';

type TMultiSelectOption = { value: string; label: string };

type TMultiSelectItemProps = {
  option: TMultiSelectOption;
  checked: boolean;
  onToggle: (value: string, checked: boolean) => void;
};

const MultiSelectItem = memo(
  ({ option, checked, onToggle }: TMultiSelectItemProps) => {
    const handleCheckedChange = useCallback(
      (isChecked: boolean) => onToggle(option.value, isChecked),
      [onToggle, option.value]
    );

    // keeps the menu open so several items can be toggled in one go
    const handleSelect = useCallback((e: Event) => e.preventDefault(), []);

    return (
      <DropdownMenuCheckboxItem
        checked={checked}
        onCheckedChange={handleCheckedChange}
        onSelect={handleSelect}
      >
        {option.label}
      </DropdownMenuCheckboxItem>
    );
  }
);

type TMultiSelectProps = {
  options: readonly TMultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
};

const MultiSelect = memo(
  ({ options, value, onChange, placeholder, className }: TMultiSelectProps) => {
    const handleToggle = useCallback(
      (item: string, checked: boolean) => {
        const next = checked
          ? [...value, item]
          : value.filter((selected) => selected !== item);

        onChange(next);
      },
      [value, onChange]
    );

    const label = useMemo(
      () =>
        options
          .filter((option) => value.includes(option.value))
          .map((option) => option.label)
          .join(', '),
      [options, value]
    );

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className={cn('justify-between font-normal', className)}
          >
            <span className={cn('truncate', !label && 'text-muted-foreground')}>
              {label || placeholder}
            </span>
            <ChevronDown className="opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
          {options.map((option) => (
            <MultiSelectItem
              key={option.value}
              option={option}
              checked={value.includes(option.value)}
              onToggle={handleToggle}
            />
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
);

export { MultiSelect, type TMultiSelectOption };
