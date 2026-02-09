import type { TEmojiItem } from '@/components/tiptap-input/types';
import { Input } from '@/components/ui/input';
import type { EmojiItem } from '@tiptap/extension-emoji';
import { memo, useCallback, useMemo, useState } from 'react';
import { searchEmojis, toTEmojiItem } from './emoji-data';
import { EmojiGrid } from './emoji-grid';
import { useRecentEmojis } from './use-recent-emojis';

interface CustomEmojiTabProps {
  customEmojis: EmojiItem[];
  onEmojiSelect: (emoji: TEmojiItem) => void;
}

const CustomEmojiTab = memo(
  ({ customEmojis, onEmojiSelect }: CustomEmojiTabProps) => {
    const [search, setSearch] = useState('');
    const { addRecent } = useRecentEmojis();

    const convertedEmojis = useMemo(
      () => customEmojis.map(toTEmojiItem),
      [customEmojis]
    );

    const displayEmojis = useMemo(
      () => searchEmojis(convertedEmojis, search),
      [convertedEmojis, search]
    );

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

    if (customEmojis.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center">
          <span className="text-3xl mb-2">:(</span>
          <p className="text-sm">No custom emojis available</p>
          <p className="text-xs mt-1">
            Server admins can upload custom emojis in server settings
          </p>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full">
        <div className="p-3 border-b">
          <Input
            placeholder="Search custom emojis..."
            value={search}
            onChange={handleSearchChange}
            className="h-9"
          />
        </div>

        <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
          {search.trim()
            ? `Search results (${displayEmojis.length})`
            : `Server emojis (${convertedEmojis.length})`}
        </div>

        <div className="flex-1 min-h-0">
          <EmojiGrid
            emojis={displayEmojis}
            onSelect={handleEmojiSelect}
            height={280}
          />
        </div>
      </div>
    );
  }
);

CustomEmojiTab.displayName = 'CustomEmojiTab';

export { CustomEmojiTab };
