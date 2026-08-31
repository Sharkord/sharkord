import { SettingsListEditor } from '@/components/server-screens/settings-shell/list-editor';
import { useAdminEmojis } from '@/features/server/admin/hooks';
import { uploadFiles } from '@/helpers/upload-file';
import { useFilePicker } from '@/hooks/use-file-picker';
import { getTRPCClient } from '@/lib/trpc';
import { Button, LoadingCard, Spinner } from '@sharkord/ui';
import { Smile, Upload } from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { EmojiList } from './emoji-list';
import { UpdateEmoji } from './update-emoji';

const Emojis = memo(() => {
  const { t } = useTranslation('settings');
  const { emojis, refetch, loading } = useAdminEmojis();
  const openFilePicker = useFilePicker();

  const [selectedEmojiId, setSelectedEmojiId] = useState<number | undefined>(
    undefined
  );
  const [isUploading, setIsUploading] = useState(false);

  const uploadEmoji = useCallback(async () => {
    const files = await openFilePicker('image/*', true);

    if (!files || files.length === 0) return;

    setIsUploading(true);

    const trpc = getTRPCClient();

    try {
      const temporaryFiles = await uploadFiles(files);

      await trpc.emojis.add.mutate(
        temporaryFiles.map((f) => ({
          name: f.originalName.replace(/\.[^/.]+$/, '').slice(0, 32),
          fileId: f.id
        }))
      );

      refetch();
      toast.success(t('emojiCreated'));
    } catch (error) {
      console.error('Error uploading emoji:', error);
      toast.error(t('failedUploadEmoji'));
    } finally {
      setIsUploading(false);
    }
  }, [openFilePicker, refetch, t]);

  const selectedEmoji = useMemo(
    () => emojis.find((emoji) => emoji.id === selectedEmojiId),
    [emojis, selectedEmojiId]
  );

  if (loading) {
    return <LoadingCard className="h-[600px]" />;
  }

  return (
    <SettingsListEditor
      emptyIcon={Smile}
      emptyTitle={t('uploadEmojiTitle')}
      emptyDescription={t('uploadEmojiDesc')}
      emptyAction={
        <Button onClick={uploadEmoji} disabled={isUploading}>
          {isUploading ? (
            <Spinner size="xxs" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {t('uploadEmojiBtn')}
        </Button>
      }
      list={
        <EmojiList
          emojis={emojis}
          setSelectedEmojiId={setSelectedEmojiId}
          selectedEmojiId={selectedEmojiId}
          uploadEmoji={uploadEmoji}
          isUploading={isUploading}
        />
      }
      editor={
        selectedEmoji && (
          <UpdateEmoji
            key={selectedEmoji.id}
            selectedEmoji={selectedEmoji}
            setSelectedEmojiId={setSelectedEmojiId}
            refetch={refetch}
          />
        )
      }
    />
  );
});

export { Emojis };
