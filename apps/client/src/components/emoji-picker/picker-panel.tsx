import type { TEmojiItem } from '@/components/tiptap-input/helpers';
import { useCustomEmojis } from '@/features/server/emojis/hooks';
import { Input, Tabs, TabsContent, TabsList, TabsTrigger } from '@sharkord/ui';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CustomEmojiTab } from './custom-emoji-tab';
import { ALL_EMOJIS, searchEmojis, toTEmojiItem } from './emoji-data';
import { EmojiGrid } from './emoji-grid';
import { NativeEmojiTab } from './native-emoji-tab';
import { useRecentEmojis } from './use-recent-emojis';

const PICKER_PANEL_CONTENT_CLASS = 'w-[320px] h-100 p-0';

type TEmojiPickerPanelProps = {
  onEmojiSelect: (emoji: TEmojiItem) => void;
  defaultTab?: 'native' | 'custom';
};

const EmojiPickerPanel = memo(
  ({ onEmojiSelect, defaultTab = 'native' }: TEmojiPickerPanelProps) => {
    const { t } = useTranslation('common');
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

    const handleSearchResultSelect = useCallback(
      (emoji: TEmojiItem) => {
        onEmojiSelect(emoji);
        requestAnimationFrame(() => addRecent(emoji));
      },
      [onEmojiSelect, addRecent]
    );

    const handleSearchChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
      },
      []
    );

    return (
      <div className="h-full flex flex-col">
        <div className="p-3 border-b">
          <Input
            placeholder={t('searchAllEmojis')}
            value={search}
            onChange={handleSearchChange}
            className="h-9"
            autoFocus
          />
        </div>

        {isSearching ? (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
              {t('searchResults', { count: searchResults.length })}
            </div>
            <div className="flex-1 min-h-0">
              <EmojiGrid
                emojis={searchResults}
                onSelect={handleSearchResultSelect}
              />
            </div>
          </div>
        ) : (
          <Tabs
            defaultValue={defaultTab}
            className="flex-1 flex flex-col min-h-0"
          >
            <TabsList className="grid w-full grid-cols-2 rounded-none border-b">
              <TabsTrigger value="native">{t('emojiTab')}</TabsTrigger>
              <TabsTrigger value="custom">{t('customTab')}</TabsTrigger>
            </TabsList>
            <TabsContent value="native" className="flex-1 mt-0 min-h-0">
              <NativeEmojiTab onEmojiSelect={onEmojiSelect} />
            </TabsContent>
            <TabsContent value="custom" className="flex-1 mt-0 min-h-0">
              <CustomEmojiTab
                customEmojis={customEmojis}
                onEmojiSelect={onEmojiSelect}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>
    );
  }
);

EmojiPickerPanel.displayName = 'EmojiPickerPanel';

export { EmojiPickerPanel, PICKER_PANEL_CONTENT_CLASS };
