import { LoadingCard } from '@/components/ui/loading-card';
import { useAdminEmojis } from '@/features/server/admin/hooks';
import { uploadFiles } from '@/helpers/upload-file';
import { useFilePicker } from '@/hooks/use-file-picker';
import { getTRPCClient } from '@/lib/trpc';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { EmojiList } from './emoji-list';
import { UpdateEmoji } from './update-emoji';
import { UploadEmoji } from './upload-emoji';

const Emojis = memo(() => {
  const { t } = useTranslation();
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
      toast.success(t('serverSettings.emojis.toasts.created'));
    } catch (error) {
      console.error('Error uploading emoji:', error);

      toast.error(t('serverSettings.emojis.toasts.uploadFailed'));
    } finally {
      setIsUploading(false);
    }
  }, [openFilePicker, refetch, t]);

  const selectedEmoji = useMemo(
    () => emojis.find((e) => e.id === selectedEmojiId),
    [emojis, selectedEmojiId]
  );

  if (loading) {
    return <LoadingCard className="h-[600px]" />;
  }

  return (
    <div className="flex gap-6">
      <EmojiList
        emojis={emojis}
        setSelectedEmojiId={(id) => setSelectedEmojiId(id)}
        selectedEmojiId={selectedEmojiId ?? -1}
        uploadEmoji={uploadEmoji}
        isUploading={isUploading}
      />

      {selectedEmoji ? (
        <UpdateEmoji
          key={selectedEmoji.id}
          selectedEmoji={selectedEmoji}
          setSelectedEmojiId={setSelectedEmojiId}
          refetch={refetch}
        />
      ) : (
        <UploadEmoji uploadEmoji={uploadEmoji} isUploading={isUploading} />
      )}
    </div>
  );
});

export { Emojis };
