import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState
} from 'react';
import { shouldUseFallbackImage, type TEmojiItem } from '../helpers';

interface EmojiListProps {
  items: TEmojiItem[];
  onSelect: (item: TEmojiItem) => void;
}

export interface EmojiListRef {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

const EmojiList = forwardRef<EmojiListRef, EmojiListProps>(
  ({ items, onSelect }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    // reset selected index when items change
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
            return false; // Let the suggestion plugin handle escape
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
      <div className="bg-popover text-popover-foreground border rounded-md shadow-md min-w-[12rem] max-w-[16rem] p-1 z-50">
        {items.map((item, index) => (
          <button
            key={item.shortcodes[0]}
            className={`w-full text-left px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground flex items-center gap-2 cursor-default select-none outline-none transition-colors ${
              index === selectedIndex ? 'bg-accent text-accent-foreground' : ''
            }`}
            type="button"
            onClick={() => onSelect(item)}
          >
            {item.emoji && !shouldUseFallbackImage(item) ? (
              <span className="text-base shrink-0">{item.emoji}</span>
            ) : item.fallbackImage ? (
              <img
                src={item.fallbackImage}
                alt={item.name}
                className="size-4 shrink-0 rounded-sm"
              />
            ) : null}
            <span className="truncate text-muted-foreground">{item.name}</span>
          </button>
        ))}
      </div>
    );
  }
);

export { EmojiList };
