import type { TEmojiItem } from '@/components/tiptap-input/helpers';
import { Popover, PopoverContent, PopoverTrigger } from '@sharkord/ui';
import { memo, useCallback, useState } from 'react';
import { EmojiPickerPanel, PICKER_PANEL_CONTENT_CLASS } from './picker-panel';

type TEmojiPickerProps = {
  children: React.ReactNode;
  onEmojiSelect: (emoji: TEmojiItem) => void;
  defaultTab?: 'native' | 'custom';
};

const EmojiPicker = memo(
  ({ children, onEmojiSelect, defaultTab }: TEmojiPickerProps) => {
    const [open, setOpen] = useState(false);

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
          className={PICKER_PANEL_CONTENT_CLASS}
          align="start"
          sideOffset={8}
        >
          <EmojiPickerPanel
            onEmojiSelect={handleEmojiSelect}
            defaultTab={defaultTab}
          />
        </PopoverContent>
      </Popover>
    );
  }
);

EmojiPicker.displayName = 'EmojiPicker';

export { EmojiPicker };
