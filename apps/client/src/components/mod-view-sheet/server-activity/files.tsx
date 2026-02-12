import { FileCard } from '@/components/channel-view/text/file-card';
import { PaginatedList } from '@/components/paginated-list';
import { requestConfirmation } from '@/features/dialogs/actions';
import { getFileUrl } from '@/helpers/get-file-url';
import { getTrpcError } from '@/helpers/parse-trpc-errors';
import { getTRPCClient } from '@/lib/trpc';
import type { TFile } from '@sharkord/shared';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useModViewContext } from '../context';

const Files = memo(() => {
  const { t } = useTranslation();
  const { files, refetch } = useModViewContext();

  const onRemoveClick = useCallback(
    async (fileId: number) => {
      const answer = await requestConfirmation({
        title: 'Delete file',
        message: 'Are you sure you want to delete this file?',
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel'
      });

      if (!answer) return;

      try {
        const trpc = getTRPCClient();

        await trpc.files.delete.mutate({ fileId });
        toast.success(t('toasts.files.deletedSuccess'));
      } catch (error) {
        toast.error(getTrpcError(error, t('toasts.files.deleteFailed')));
      } finally {
        refetch();
      }
    },
    [refetch, t]
  );

  const renderItem = useCallback(
    (file: TFile) => (
      <FileCard
        name={file.originalName}
        extension={file.extension}
        size={file.size}
        onRemove={() => onRemoveClick(file.id)}
        href={getFileUrl(file)}
      />
    ),
    [onRemoveClick]
  );

  const searchFilter = useCallback(
    (file: TFile, term: string) =>
      file.originalName.toLowerCase().includes(term.toLowerCase()) ||
      file.extension.toLowerCase().includes(term.toLowerCase()),
    []
  );

  return (
    <PaginatedList
      items={files}
      renderItem={renderItem}
      searchFilter={searchFilter}
      searchPlaceholder={t('placeholders.searchFiles')}
      emptyMessage="No files uploaded."
      itemsPerPage={8}
    />
  );
});

export { Files };
