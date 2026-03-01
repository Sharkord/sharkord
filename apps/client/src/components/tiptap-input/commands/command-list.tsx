import type { TBuiltInCommand } from '@/helpers/built-in-commands';
import { Terminal } from 'lucide-react';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState
} from 'react';

interface CommandListProps {
  items: TBuiltInCommand[];
  onSelect: (item: TBuiltInCommand) => void;
}

export interface CommandListRef {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

const CommandList = forwardRef<CommandListRef, CommandListProps>(
  ({ items, onSelect }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

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
            setSelectedIndex((prev) =>
              prev <= 0 ? items.length - 1 : prev - 1
            );
            return true;
          case 'ArrowDown':
            event.preventDefault();
            setSelectedIndex((prev) =>
              prev >= items.length - 1 ? 0 : prev + 1
            );
            return true;
          case 'Enter':
          case 'Tab':
            event.preventDefault();
            selectItem(selectedIndex);
            return true;
          case 'Escape':
            return false;
          default:
            return false;
        }
      },
      [items, selectItem, selectedIndex]
    );

    useImperativeHandle(ref, () => ({
      onKeyDown
    }));

    if (items.length === 0) {
      return null;
    }

    return (
      <div className="bg-popover text-popover-foreground border rounded-md shadow-md min-w-[12rem] max-w-[20rem] p-1 z-50">
        {items.map((item, index) => (
          <button
            key={item.name}
            className={`w-full text-left px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground flex items-center gap-2 cursor-default select-none outline-none transition-colors ${
              index === selectedIndex ? 'bg-accent text-accent-foreground' : ''
            }`}
            type="button"
            onClick={() => onSelect(item)}
          >
            <Terminal className="size-4 shrink-0 text-muted-foreground" />
            <div className="flex flex-col min-w-0">
              <span className="truncate font-medium">/{item.name}</span>
              {item.description && (
                <span className="truncate text-xs text-muted-foreground">
                  {item.description}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    );
  }
);

export { CommandList };
