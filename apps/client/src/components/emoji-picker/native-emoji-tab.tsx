import type { TEmojiItem } from '@/components/tiptap-input/types';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { memo, useCallback, useMemo, useState } from 'react';
import {
  ALL_EMOJIS,
  EMOJI_CATEGORIES,
  type EmojiCategoryId,
  getEmojisByCategory,
  searchEmojis
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
  const [search, setSearch] = useState('');
  const { recentEmojis, addRecent } = useRecentEmojis();

  const [activeCategory, setActiveCategory] = useState<EmojiCategoryId>(() =>
    recentEmojis.length > 0 ? 'recent' : 'people & body'
  );

  const isSearching = search.trim().length > 0;
  const hasRecentEmojis = recentEmojis.length > 0;

  const displayEmojis = useMemo(() => {
    if (isSearching) {
      return searchEmojis(ALL_EMOJIS, search);
    }
    if (activeCategory === 'recent') {
      return recentEmojis;
    }
    return getEmojisByCategory(activeCategory);
  }, [isSearching, search, activeCategory, recentEmojis]);

  const handleCategorySelect = useCallback((category: EmojiCategoryId) => {
    setActiveCategory(category);
    setSearch('');
  }, []);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
    },
    []
  );

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
      <div className="p-3 border-b mt-[-8px]">
        <Input
          placeholder="Search emojis..."
          value={search}
          onChange={handleSearchChange}
          className="h-9"
          autoFocus
        />
      </div>

      {!isSearching && (
        <CategoryBar
          activeCategory={effectiveCategory}
          onCategorySelect={handleCategorySelect}
          hasRecentEmojis={hasRecentEmojis}
        />
      )}

      {!isSearching && (
        <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
          {EMOJI_CATEGORIES.find((c) => c.id === effectiveCategory)?.label}
        </div>
      )}

      {isSearching && (
        <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
          Search results ({displayEmojis.length})
        </div>
      )}

      <div className="flex-1 min-h-0">
        <EmojiGrid
          emojis={displayEmojis}
          onSelect={handleEmojiSelect}
          height={isSearching ? 260 : 220}
        />
      </div>
    </div>
  );
});

export { NativeEmojiTab };
