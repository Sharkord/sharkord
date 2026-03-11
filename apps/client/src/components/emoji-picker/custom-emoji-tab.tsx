import type { TEmojiItem } from '@/components/tiptap-input/helpers';
import type { EmojiItem } from '@tiptap/extension-emoji';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toTEmojiItem } from './emoji-data';
import { EmojiGrid } from './emoji-grid';
import { useRecentEmojis } from './use-recent-emojis';

interface CustomEmojiTabProps {
  customEmojis: EmojiItem[];
  onEmojiSelect: (emoji: TEmojiItem) => void;
}

const CustomEmojiTab = memo(
  ({ customEmojis, onEmojiSelect }: CustomEmojiTabProps) => {
    const { t } = useTranslation('common');
    const { addRecent } = useRecentEmojis();

    const convertedEmojis = useMemo(
      () => customEmojis.map(toTEmojiItem),
      [customEmojis]
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
          <p className="text-sm">{t('noCustomEmojis')}</p>
          <p className="text-xs mt-1">{t('serverAdminsCanUpload')}</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full">
        <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
          {t('serverEmojis', { count: convertedEmojis.length })}
        </div>

        <div className="flex-1 min-h-0">
          <EmojiGrid
            emojis={convertedEmojis}
            onSelect={handleEmojiSelect}
            height={300}
          />
        </div>
      </div>
    );
  }
);

CustomEmojiTab.displayName = 'CustomEmojiTab';

export { CustomEmojiTab };
