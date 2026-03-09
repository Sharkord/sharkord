import { requestConfirmation } from '@/features/dialogs/actions';
import { getFileUrl } from '@/helpers/get-file-url';
import { getTRPCClient } from '@/lib/trpc';
import {
  parseTrpcErrors,
  type TJoinedEmoji,
  type TTrpcErrors
} from '@sharkord/shared';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label
} from '@sharkord/ui';
import { filesize } from 'filesize';
import { Trash2 } from 'lucide-react';
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Emoji } from './emoji';

type TUpdateEmojiProps = {
  selectedEmoji: TJoinedEmoji;
  setSelectedEmojiId: (id: number | undefined) => void;
  refetch: () => void;
};

const UpdateEmoji = memo(
  ({ selectedEmoji, setSelectedEmojiId, refetch }: TUpdateEmojiProps) => {
    const { t } = useTranslation('settings');
    const [name, setName] = useState(selectedEmoji.name);
    const [errors, setErrors] = useState<TTrpcErrors>({});

    const onDeleteEmoji = useCallback(async () => {
      const choice = await requestConfirmation({
        title: t('deleteEmojiTitle'),
        message: t('deleteEmojiMsg'),
        confirmLabel: t('deleteEmojiBtn')
      });

      if (!choice) return;

      const trpc = getTRPCClient();

      try {
        await trpc.emojis.delete.mutate({ emojiId: selectedEmoji.id });
        toast.success(t('emojiDeleted'));
        refetch();
        setSelectedEmojiId(undefined);
      } catch {
        toast.error(t('failedDeleteEmoji'));
      }
    }, [selectedEmoji.id, refetch, setSelectedEmojiId, t]);

    const onUpdateEmoji = useCallback(async () => {
      const trpc = getTRPCClient();

      try {
        await trpc.emojis.update.mutate({ emojiId: selectedEmoji.id, name });
        toast.success(t('emojiUpdated'));
        refetch();
      } catch (error) {
        setErrors(parseTrpcErrors(error));
      }
    }, [name, selectedEmoji.id, refetch, t]);

    const onNameChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setName(e.target.value);
        setErrors((prev) => ({ ...prev, name: undefined }));
      },
      []
    );

    return (
      <Card className="flex-1">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('editEmojiTitle')}</CardTitle>
            <Button size="icon" variant="ghost" onClick={onDeleteEmoji}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
            <Emoji
              src={getFileUrl(selectedEmoji.file)}
              name={selectedEmoji.name}
              className="h-16 w-16"
            />
            <div>
              <div className="font-medium">:{selectedEmoji.name}:</div>
              <div className="text-sm text-muted-foreground">
                {filesize(selectedEmoji.file.size)} • {t('emojiUploadedBy')}{' '}
                {selectedEmoji.user.name}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emoji-name">{t('emojiNameLabel')}</Label>
              <Input
                id="emoji-name"
                value={name}
                onChange={onNameChange}
                placeholder={t('emojiNamePlaceholder')}
                error={errors.name}
              />
              <p className="text-xs text-muted-foreground">
                {t('emojiNameHint', { name: selectedEmoji.name })}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setSelectedEmojiId(undefined)}
            >
              {t('close')}
            </Button>
            <Button
              onClick={onUpdateEmoji}
              disabled={selectedEmoji.name === name}
            >
              {t('saveChanges')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
);

export { UpdateEmoji };
