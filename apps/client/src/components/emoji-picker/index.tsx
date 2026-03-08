import type { TEmojiItem } from '@/components/tiptap-input/helpers';
import { useCustomEmojis } from '@/features/server/emojis/hooks';
import {
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@sharkord/ui';
import { memo, useCallback, useMemo, useState } from 'react';
import { CustomEmojiTab } from './custom-emoji-tab';
import { ALL_EMOJIS, searchEmojis, toTEmojiItem } from './emoji-data';
import { EmojiGrid } from './emoji-grid';
import { NativeEmojiTab } from './native-emoji-tab';
import { useRecentEmojis } from './use-recent-emojis';

type TEmojiPickerProps = {
  children: React.ReactNode;
  onEmojiSelect: (emoji: TEmojiItem) => void;
  defaultTab?: 'native' | 'custom';
};

const EmojiPicker = memo(
  ({ children, onEmojiSelect, defaultTab = 'native' }: TEmojiPickerProps) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const customEmojis = useCustomEmojis();
    const { addRecent } = useRecentEmojis();

    const convertedCustomEmojis = useMemo(
      () => customEmojis.map(toTEmojiItem),
      [customEmojis]
    );

    const allEmojis = useMemo(
      () => [...ALL_EMOJIS, ...convertedCustomEmojis],
      [convertedCustomEmojis]
    );

    const isSearching = search.trim().length > 0;

    const searchResults = useMemo(
      () => (isSearching ? searchEmojis(allEmojis, search) : []),
      [isSearching, allEmojis, search]
    );

    const handleEmojiSelect = useCallback(
      (emoji: TEmojiItem) => {
        onEmojiSelect(emoji);
        setOpen(false);
      },
      [onEmojiSelect]
    );

    const handleSearchResultSelect = useCallback(
      (emoji: TEmojiItem) => {
        handleEmojiSelect(emoji);
        requestAnimationFrame(() => addRecent(emoji));
      },
      [handleEmojiSelect, addRecent]
    );

    const handleSearchChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
      },
      []
    );

    const handleOpenChange = useCallback((nextOpen: boolean) => {
      setOpen(nextOpen);
      if (!nextOpen) {
        setSearch('');
      }
    }, []);

    return (
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>{children}</PopoverTrigger>
        <PopoverContent
          className="w-[320px] p-0 h-100"
          align="start"
          sideOffset={8}
        >
          <div className="h-full flex flex-col">
            <div className="p-3 border-b">
              <Input
                placeholder="Search all emojis..."
                value={search}
                onChange={handleSearchChange}
                className="h-9"
                autoFocus
              />
            </div>

            {isSearching ? (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
                  Search results ({searchResults.length})
                </div>
                <div className="flex-1 min-h-0">
                  <EmojiGrid
                    emojis={searchResults}
                    onSelect={handleSearchResultSelect}
                    height={300}
                  />
                </div>
              </div>
            ) : (
              <Tabs
                defaultValue={defaultTab}
                className="flex-1 flex flex-col min-h-0"
              >
                <TabsList className="grid w-full grid-cols-2 rounded-none border-b">
                  <TabsTrigger value="native">Emoji</TabsTrigger>
                  <TabsTrigger value="custom">Custom</TabsTrigger>
                </TabsList>
                <TabsContent value="native" className="flex-1 mt-0 min-h-0">
                  <NativeEmojiTab onEmojiSelect={handleEmojiSelect} />
                </TabsContent>
                <TabsContent value="custom" className="flex-1 mt-0 min-h-0">
                  <CustomEmojiTab
                    customEmojis={customEmojis}
                    onEmojiSelect={handleEmojiSelect}
                  />
                </TabsContent>
              </Tabs>
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  }
);

EmojiPicker.displayName = 'EmojiPicker';

export { EmojiPicker };
