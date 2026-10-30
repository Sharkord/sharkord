import { SettingsSection } from '@/components/server-screens/settings-shell/section';
import { getFileUrl } from '@/helpers/get-file-url';
import type { TJoinedEmoji } from '@sharkord/shared';
import { IconButton, Input, Spinner, Tooltip } from '@sharkord/ui';
import { Plus, Search } from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Emoji } from './emoji';

type TEmojiListProps = {
  emojis: TJoinedEmoji[];
  setSelectedEmojiId: (id: number) => void;
  selectedEmojiId: number | undefined;
  uploadEmoji: () => void;
  isUploading: boolean;
};

type TEmojiOptionProps = {
  emoji: TJoinedEmoji;
  isSelected: boolean;
  onSelect: (emojiId: number) => void;
};

const EmojiOption = memo(
  ({ emoji, isSelected, onSelect }: TEmojiOptionProps) => {
    const onClick = useCallback(() => onSelect(emoji.id), [onSelect, emoji.id]);

    return (
      <Emoji
        src={getFileUrl(emoji.file)}
        name={emoji.name}
        onClick={onClick}
        className={
          isSelected
            ? 'bg-accent ring-2 ring-primary h-full w-full'
            : 'h-full w-full'
        }
      />
    );
  }
);

const EmojiList = memo(
  ({
    emojis,
    setSelectedEmojiId,
    selectedEmojiId,
    uploadEmoji,
    isUploading
  }: TEmojiListProps) => {
    const { t } = useTranslation('settings');
    const [search, setSearch] = useState('');

    const onSearchChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value),
      []
    );

    const filteredEmojis = useMemo(() => {
      const sorted = emojis.sort((a, b) => b.createdAt - a.createdAt);

      if (!search) return sorted;

      return sorted.filter((emoji) =>
        emoji.name.toLowerCase().includes(search.toLowerCase())
      );
    }, [emojis, search]);

    let emptyLabel = t('noCustomEmojisYet');

    if (search) {
      emptyLabel = t('noEmojisFound');
    }

    let uploadAction = (
      <Tooltip content={t('uploadEmojiBtn')}>
        <IconButton
          icon={Plus}
          size="sm"
          variant="ghost"
          onClick={uploadEmoji}
        />
      </Tooltip>
    );

    if (isUploading) {
      uploadAction = <Spinner size="xxs" />;
    }

    return (
      <SettingsSection title={t('emojiTitle')} action={uploadAction}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('searchEmojisPlaceholder')}
            value={search}
            onChange={onSearchChange}
            className="pl-9"
          />
        </div>
        <div className="max-h-96 overflow-y-auto">
          {filteredEmojis.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {emptyLabel}
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-2">
              {filteredEmojis.map((emoji) => (
                <EmojiOption
                  key={emoji.id}
                  emoji={emoji}
                  isSelected={selectedEmojiId === emoji.id}
                  onSelect={setSelectedEmojiId}
                />
              ))}
            </div>
          )}
        </div>
      </SettingsSection>
    );
  }
);

export { EmojiList };
