import { cn } from '@/lib/utils';
import {
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
  type ReactNode,
  type Ref
} from 'react';

type TSuggestionListRef = {
  onKeyDown: (event: KeyboardEvent) => boolean;
};

type TSuggestionListItemProps = {
  index: number;
  isSelected: boolean;
  onSelect: (index: number) => void;
  className?: string;
  children: ReactNode;
};

const SuggestionListItem = memo(
  ({
    index,
    isSelected,
    onSelect,
    className,
    children
  }: TSuggestionListItemProps) => {
    const handleClick = useCallback(() => onSelect(index), [index, onSelect]);

    return (
      <button
        type="button"
        role="option"
        aria-selected={isSelected}
        onClick={handleClick}
        className={cn(
          'w-full text-left px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground flex items-center gap-2 cursor-default select-none outline-none transition-colors',
          isSelected && 'bg-accent text-accent-foreground',
          className
        )}
      >
        {children}
      </button>
    );
  }
);

type TSuggestionListProps<TItem> = {
  items: TItem[];
  onSelect: (item: TItem) => void;
  getKey: (item: TItem) => string | number;
  renderItem: (item: TItem) => ReactNode;
  ariaLabel: string;
  className?: string;
  itemClassName?: string;
  ref?: Ref<TSuggestionListRef>;
};

const SuggestionList = <TItem,>({
  items,
  onSelect,
  getKey,
  renderItem,
  ariaLabel,
  className,
  itemClassName,
  ref
}: TSuggestionListProps<TItem>) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => setSelectedIndex(0), [items]);

  const selectItem = useCallback(
    (index: number) => {
      const item = items[index];

      if (item) {
        onSelect(item);
      }
    },
    [items, onSelect]
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent): boolean => {
      if (items.length === 0) return false;

      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex((prev) => (prev <= 0 ? items.length - 1 : prev - 1));

          return true;
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex((prev) => (prev >= items.length - 1 ? 0 : prev + 1));

          return true;
        case 'Enter':
        case 'Tab':
          event.preventDefault();
          selectItem(selectedIndex);

          return true;
        default:
          // escape included, the suggestion plugin closes the popup itself
          return false;
      }
    },
    [items, selectItem, selectedIndex]
  );

  useImperativeHandle(ref, () => ({ onKeyDown }), [onKeyDown]);

  if (items.length === 0) return null;

  return (
    <div
      className={cn(
        'bg-popover text-popover-foreground border rounded-md shadow-md max-h-60 overflow-y-auto p-1',
        className
      )}
      role="listbox"
      aria-label={ariaLabel}
    >
      {items.map((item, index) => (
        <SuggestionListItem
          key={getKey(item)}
          index={index}
          isSelected={index === selectedIndex}
          onSelect={selectItem}
          className={itemClassName}
        >
          {renderItem(item)}
        </SuggestionListItem>
      ))}
    </div>
  );
};

export { SuggestionList };
export type { TSuggestionListRef };
