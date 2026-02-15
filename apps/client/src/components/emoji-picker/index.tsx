import type { TEmojiItem } from '@/components/tiptap-input/types';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCustomEmojis } from '@/features/server/emojis/hooks';
import { memo, useCallback, useState } from 'react';
import { CustomEmojiTab } from './custom-emoji-tab';
import { GifTab } from './gif-tab';
import { NativeEmojiTab } from './native-emoji-tab';

type TEmojiPickerProps = {
  children: React.ReactNode;
  onEmojiSelect: (emoji: TEmojiItem) => void;
  onGifSelect?: (gifUrl: string) => void;
  defaultTab?: 'native' | 'gif' | 'custom';
};

const EmojiPicker = memo(
  ({
    children,
    onEmojiSelect,
    onGifSelect,
    defaultTab = 'native'
  }: TEmojiPickerProps) => {
    const [open, setOpen] = useState(false);
    const customEmojis = useCustomEmojis();
    const showGifTab = !!onGifSelect;

    const handleEmojiSelect = useCallback(
      (emoji: TEmojiItem) => {
        onEmojiSelect(emoji);
        setOpen(false);
      },
      [onEmojiSelect]
    );

    const handleGifSelect = useCallback(
      (gifUrl: string) => {
        onGifSelect?.(gifUrl);
        setOpen(false);
      },
      [onGifSelect]
    );

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{children}</PopoverTrigger>
        <PopoverContent
          className="w-[320px] p-0 h-[400px]"
          align="start"
          sideOffset={8}
        >
          <Tabs defaultValue={defaultTab} className="h-full flex flex-col">
            <TabsList
              className={`grid w-full rounded-none border-b ${
                showGifTab ? 'grid-cols-3' : 'grid-cols-2'
              }`}
            >
              <TabsTrigger value="native">Emoji</TabsTrigger>
              {showGifTab && (
                <TabsTrigger value="gif">GIF</TabsTrigger>
              )}
              <TabsTrigger value="custom">Custom</TabsTrigger>
            </TabsList>
            <TabsContent value="native" className="flex-1 mt-0 min-h-0">
              <NativeEmojiTab onEmojiSelect={handleEmojiSelect} />
            </TabsContent>
            {showGifTab && (
              <TabsContent value="gif" className="flex-1 mt-0 min-h-0">
                <GifTab onGifSelect={handleGifSelect} />
              </TabsContent>
            )}
            <TabsContent value="custom" className="flex-1 mt-0 min-h-0">
              <CustomEmojiTab
                customEmojis={customEmojis}
                onEmojiSelect={handleEmojiSelect}
              />
            </TabsContent>
          </Tabs>
        </PopoverContent>
      </Popover>
    );
  }
);

EmojiPicker.displayName = 'EmojiPicker';

export { EmojiPicker };
