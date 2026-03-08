import type { TEmojiItem } from '@/components/tiptap-input/helpers';
import { cn } from '@/lib/utils';
import { memo, useCallback, useMemo, useState } from 'react';
import {
  EMOJI_CATEGORIES,
  type EmojiCategoryId,
  getEmojisByCategory
} from './emoji-data';
import { EmojiGrid } from './emoji-grid';
import { useRecentEmojis } from './use-recent-emojis';

type TCategoryBarProps = {
  activeCategory: EmojiCategoryId;
  onCategorySelect: (category: EmojiCategoryId) => void;
  hasRecentEmojis: boolean;
};

const CategoryBar = memo(
  ({
    activeCategory,
    onCategorySelect,
    hasRecentEmojis
  }: TCategoryBarProps) => (
    <div className="flex gap-1 px-3 py-2 border-b bg-muted/30">
      {EMOJI_CATEGORIES.map((category) => {
        if (category.id === 'recent' && !hasRecentEmojis) {
          return null;
        }

        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onCategorySelect(category.id)}
            className={cn(
              'w-7 h-7 flex items-center justify-center rounded-md text-base transition-colors cursor-pointer',
              activeCategory === category.id
                ? 'bg-accent text-accent-foreground'
                : 'hover:bg-accent/50'
            )}
            title={category.label}
          >
            {category.icon}
          </button>
        );
      })}
    </div>
  )
);

type TNativeEmojiTabProps = {
  onEmojiSelect: (emoji: TEmojiItem) => void;
};

const NativeEmojiTab = memo(({ onEmojiSelect }: TNativeEmojiTabProps) => {
  const { recentEmojis, addRecent } = useRecentEmojis();

  const [activeCategory, setActiveCategory] = useState<EmojiCategoryId>(() =>
    recentEmojis.length > 0 ? 'recent' : 'people & body'
  );

  const hasRecentEmojis = recentEmojis.length > 0;

  const displayEmojis = useMemo(() => {
    if (activeCategory === 'recent') {
      return recentEmojis;
    }
    return getEmojisByCategory(activeCategory);
  }, [activeCategory, recentEmojis]);

  const handleCategorySelect = useCallback((category: EmojiCategoryId) => {
    setActiveCategory(category);
  }, []);

  const handleEmojiSelect = useCallback(
    (emoji: TEmojiItem) => {
      onEmojiSelect(emoji);
      requestAnimationFrame(() => addRecent(emoji));
    },
    [addRecent, onEmojiSelect]
  );

  const effectiveCategory =
    activeCategory === 'recent' && !hasRecentEmojis
      ? 'people & body'
      : activeCategory;

  return (
    <div className="flex flex-col h-full">
      <CategoryBar
        activeCategory={effectiveCategory}
        onCategorySelect={handleCategorySelect}
        hasRecentEmojis={hasRecentEmojis}
      />

      <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
        {EMOJI_CATEGORIES.find((c) => c.id === effectiveCategory)?.label}
      </div>

      <div className="flex-1 min-h-0">
        <EmojiGrid
          emojis={displayEmojis}
          onSelect={handleEmojiSelect}
          height={260}
        />
      </div>
    </div>
  );
});

export { NativeEmojiTab };
