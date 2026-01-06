import type { TEmojiItem } from '@/components/tiptap-input/types';
import { Input } from '@/components/ui/input';
import { gitHubEmojis } from '@tiptap/extension-emoji';
import { useCallback, useMemo, useState } from 'react';
import { AutoFocus } from '../ui/auto-focus';

interface NativeEmojiTabProps {
  onEmojiSelect: (emoji: TEmojiItem) => void;
}

const NativeEmojiTab = ({ onEmojiSelect }: NativeEmojiTabProps) => {
  const [search, setSearch] = useState('');

  const convertedEmojis: TEmojiItem[] = useMemo(
    () =>
      gitHubEmojis.map((emoji) => ({
        name: emoji.name,
        shortcodes: emoji.shortcodes,
        fallbackImage: emoji.fallbackImage,
        emoji: emoji.emoji
      })),
    []
  );

  const filteredEmojis = useMemo(
    () =>
      convertedEmojis.filter(
        (emoji) =>
          emoji.name.toLowerCase().includes(search.toLowerCase()) ||
          emoji.shortcodes.some((shortcode) =>
            shortcode.toLowerCase().includes(search.toLowerCase())
          )
      ),
    [convertedEmojis, search]
  );

  const handleEmojiClick = useCallback(
    (emoji: TEmojiItem) => {
      onEmojiSelect(emoji);
    },
    [onEmojiSelect]
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b">
        <AutoFocus>
          <Input
            placeholder="Search native emojis..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9"
          />
        </AutoFocus>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-3">
          {filteredEmojis.length === 0 ? (
            <div className="text-center text-muted-foreground py-6">
              No emojis found
            </div>
          ) : (
            <div className="grid grid-cols-8 gap-1 w-full max-w-full">
              {filteredEmojis.map((emoji) => (
                <button
                  key={`${emoji.name}-${emoji.shortcodes[0]}`}
                  onClick={() => handleEmojiClick(emoji)}
                  className="w-8 h-8 flex items-center justify-center hover:bg-accent rounded-sm transition-colors shrink-0"
                  title={`${emoji.name} (${emoji.shortcodes[0]})`}
                >
                  {emoji.emoji ? (
                    <span className="text-lg">{emoji.emoji}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {emoji.shortcodes[0]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export { NativeEmojiTab };
