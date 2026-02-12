import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Spinner from '@/components/ui/spinner';
import { getFileUrl } from '@/helpers/get-file-url';
import type { TJoinedEmoji } from '@sharkord/shared';
import { Plus, Search } from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Emoji } from './emoji';

type TEmojiListProps = {
  emojis: TJoinedEmoji[];
  setSelectedEmojiId: (id: number) => void;
  selectedEmojiId: number;
  uploadEmoji: () => void;
  isUploading: boolean;
};

const EmojiList = memo(
  ({
    emojis,
    setSelectedEmojiId,
    selectedEmojiId,
    uploadEmoji,
    isUploading
  }: TEmojiListProps) => {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');

    const filteredEmojis = useMemo(() => {
      const sorted = emojis.sort((a, b) => b.createdAt - a.createdAt);

      if (!search) return sorted;

      return sorted.filter((emoji) =>
        emoji.name.toLowerCase().includes(search.toLowerCase())
      );
    }, [emojis, search]);

    return (
      <Card className="w-80 flex-shrink-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {t('serverSettings.emojis.title')}
            </CardTitle>
            <Button
              size="icon"
              variant="ghost"
              onClick={uploadEmoji}
              disabled={isUploading}
            >
              {isUploading ? (
                <Spinner size="xs" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('serverSettings.emojis.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="max-h-96 overflow-y-auto">
            {filteredEmojis.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {search
                  ? t('serverSettings.emojis.emptySearch')
                  : t('serverSettings.emojis.emptyList')}
              </div>
            ) : (
              <div className="grid grid-cols-6 gap-2">
                {filteredEmojis.map((emoji) => (
                  <Emoji
                    key={emoji.id}
                    src={getFileUrl(emoji.file)}
                    name={emoji.name}
                    onClick={() => setSelectedEmojiId(emoji.id)}
                    className={
                      selectedEmojiId === emoji.id
                        ? 'bg-accent ring-2 ring-primary h-full w-full'
                        : 'h-full w-full'
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
);

export { EmojiList };
