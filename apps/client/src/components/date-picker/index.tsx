'use client';

import {
  Button,
  Calendar,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@sharkord/ui';
import { CalendarIcon } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';

type TDatePickerProps = {
  value: number | undefined;
  onChange: (timestamp: number) => void;
  placeholder?: string;
  className?: string;
  minDate?: number; // Unix timestamp
  maxDate?: number; // Unix timestamp
};

const formatDate = (date: Date | undefined): string => {
  if (!date) {
    return '';
  }

  return date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
};

const isValidDate = (date: Date): boolean => {
  if (!date) {
    return false;
  }

  return !isNaN(date.getTime());
};

const DatePicker = memo(
  ({
    value = 0,
    onChange,
    placeholder = 'Select date...',
    className,
    minDate,
    maxDate
  }: TDatePickerProps) => {
    const [open, setOpen] = useState(false);

    const dateFromValue = useMemo(() => {
      return value ? new Date(value) : undefined;
    }, [value]);

    const minDateObj = useMemo(() => {
      return minDate ? new Date(minDate) : undefined;
    }, [minDate]);

    const maxDateObj = useMemo(() => {
      return maxDate ? new Date(maxDate) : undefined;
    }, [maxDate]);

    const [month, setMonth] = useState<Date | undefined>(dateFromValue);
    const [inputValue, setInputValue] = useState(() =>
      formatDate(dateFromValue)
    );

    useEffect(() => {
      setInputValue(formatDate(dateFromValue));

      if (dateFromValue) {
        setMonth(dateFromValue);
      }
    }, [dateFromValue]);

    const handleInputChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);

        const parsedDate = new Date(newValue);
        if (isValidDate(parsedDate)) {
          const timestamp = parsedDate.getTime();

          if (minDate && timestamp < minDate) return;
          if (maxDate && timestamp > maxDate) return;

          onChange?.(timestamp);
          setMonth(parsedDate);
        }
      },
      [onChange, minDate, maxDate]
    );

    const handleDateSelect = useCallback(
      (selectedDate: Date | undefined) => {
        if (selectedDate) {
          const timestamp = selectedDate.getTime();

          onChange?.(timestamp);
          setInputValue(formatDate(selectedDate));
        } else {
          onChange?.(0);
          setInputValue('');
        }

        setOpen(false);
      },
      [onChange]
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setOpen(true);
        }
      },
      []
    );

    return (
      <div className={`relative flex gap-2 ${className || ''}`}>
        <Input
          value={inputValue}
          placeholder={placeholder}
          className="bg-background pr-10"
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
            >
              <CalendarIcon className="size-3.5" />
              <span className="sr-only">Select date</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto overflow-hidden p-0"
            align="end"
            alignOffset={-8}
            sideOffset={10}
          >
            <Calendar
              mode="single"
              selected={dateFromValue}
              captionLayout="dropdown"
              month={month}
              onMonthChange={setMonth}
              onSelect={handleDateSelect}
              fromDate={minDateObj}
              toDate={maxDateObj}
              disabled={(date) => {
                if (minDateObj && date < minDateObj) return true;
                if (maxDateObj && date > maxDateObj) return true;
                return false;
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
    );
  }
);

export { DatePicker };
