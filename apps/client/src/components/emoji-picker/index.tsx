import type { TEmojiItem } from '@/components/tiptap-input/types';
import { useCustomEmojis } from '@/features/server/emojis/hooks';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@sharkord/ui';
import { memo, useCallback, useState } from 'react';
import { CustomEmojiTab } from './custom-emoji-tab';
import { NativeEmojiTab } from './native-emoji-tab';

type TEmojiPickerProps = {
  children: React.ReactNode;
  onEmojiSelect: (emoji: TEmojiItem) => void;
  defaultTab?: 'native' | 'custom';
};

const EmojiPicker = memo(
  ({ children, onEmojiSelect, defaultTab = 'native' }: TEmojiPickerProps) => {
    const [open, setOpen] = useState(false);
    const customEmojis = useCustomEmojis();

    const handleEmojiSelect = useCallback(
      (emoji: TEmojiItem) => {
        onEmojiSelect(emoji);
        setOpen(false);
      },
      [onEmojiSelect]
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
        </PopoverContent>
      </Popover>
    );
  }
);

EmojiPicker.displayName = 'EmojiPicker';

export { EmojiPicker };
