import type { TCommandInfo } from '@sharkord/shared';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState
} from 'react';

interface CommandListProps {
  items: TCommandInfo[];
  onSelect: (item: TCommandInfo) => void;
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
      <div className="bg-popover text-popover-foreground border rounded-md shadow-md min-w-[16rem] max-w-[22rem] p-1 z-50">
        {items.map((item, index) => (
          <button
            key={`${item.pluginId}:${item.name}`}
            className={`w-full text-left px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground flex flex-col gap-0.5 cursor-default select-none outline-none transition-colors ${
              index === selectedIndex ? 'bg-accent text-accent-foreground' : ''
            }`}
            type="button"
            onClick={() => onSelect(item)}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground shrink-0">/</span>
              <span className="font-medium truncate">{item.name}</span>
              <span className="text-[10px] text-muted-foreground ml-auto truncate">
                {item.pluginId}
              </span>
            </div>
            {item.description && (
              <span className="text-xs text-muted-foreground truncate">
                {item.description}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }
);

export { CommandList };
