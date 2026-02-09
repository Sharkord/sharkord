import type { TEmojiItem } from '@/components/tiptap-input/types';
import { memo, useCallback, useMemo } from 'react';
import { VirtuosoGrid } from 'react-virtuoso';
import { GRID_COLS } from './emoji-data';

type TEmojiButtonProps = {
  emoji: TEmojiItem;
  onSelect: (emoji: TEmojiItem) => void;
};

const EmojiButton = memo(({ emoji, onSelect }: TEmojiButtonProps) => (
  <button
    type="button"
    onClick={() => onSelect(emoji)}
    className="w-8 h-8 flex items-center justify-center hover:bg-accent rounded-md transition-colors cursor-pointer"
    title={`:${emoji.shortcodes[0]}:`}
  >
    {emoji.emoji ? (
      <span className="text-xl leading-none">{emoji.emoji}</span>
    ) : emoji.fallbackImage ? (
      <img
        src={emoji.fallbackImage}
        alt={emoji.name}
        className="w-6 h-6 object-contain"
        loading="lazy"
      />
    ) : (
      <span className="text-xs text-muted-foreground truncate">
        {emoji.shortcodes[0]}
      </span>
    )}
  </button>
));

type TEmojiGridProps = {
  emojis: TEmojiItem[];
  onSelect: (emoji: TEmojiItem) => void;
  height?: number;
};

const EmojiGrid = memo(
  ({ emojis, onSelect, height = 280 }: TEmojiGridProps) => {
    const rowCount = useMemo(
      () => Math.ceil(emojis.length / GRID_COLS),
      [emojis.length]
    );

    const itemContent = useCallback(
      (index: number) => {
        const emoji = emojis[index];
        if (!emoji) return null;
        return <EmojiButton emoji={emoji} onSelect={onSelect} />;
      },
      [emojis, onSelect]
    );

    if (emojis.length === 0) {
      return (
        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
          No emojis found
        </div>
      );
    }

    if (rowCount <= 6) {
      return (
        <div className="grid grid-cols-8 gap-1 p-3">
          {emojis.map((emoji) => (
            <EmojiButton key={emoji.name} emoji={emoji} onSelect={onSelect} />
          ))}
        </div>
      );
    }

    return (
      <VirtuosoGrid
        style={{ height }}
        totalCount={emojis.length}
        overscan={200}
        listClassName="grid grid-cols-8 gap-1 p-3"
        itemContent={itemContent}
        computeItemKey={(index) => emojis[index]?.name ?? index}
      />
    );
  }
);

export { EmojiButton, EmojiGrid };
