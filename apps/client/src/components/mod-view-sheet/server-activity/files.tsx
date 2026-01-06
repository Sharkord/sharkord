import { FileCard } from '@/components/channel-view/text/file-card';
import { PaginatedList } from '@/components/paginated-list';
import { requestConfirmation } from '@/features/dialogs/actions';
import { downloadFile } from '@/helpers/download-file';
import { getTrpcError } from '@/helpers/parse-trpc-errors';
import { getTRPCClient } from '@/lib/trpc';
import type { TFile } from '@sharkord/shared';
import { memo, useCallback } from 'react';
import { toast } from 'sonner';
import { useModViewContext } from '../context';

const Files = memo(() => {
  const { files, refetch } = useModViewContext();

  const onRemoveClick = useCallback(
    async (fileId: number) => {
      const answer = await requestConfirmation({
        title: 'Remove File',
        message: 'Are you sure you want to remove this file?',
        confirmLabel: 'Remove',
        cancelLabel: 'Cancel'
      });

      if (!answer) return;

      try {
        const trpc = getTRPCClient();

        await trpc.files.delete.mutate({ fileId });
        toast.success('File removed successfully');
      } catch (error) {
        toast.error(getTrpcError(error, 'Failed to remove file'));
      } finally {
        refetch();
      }
    },
    [refetch]
  );

  const renderItem = useCallback(
    (file: TFile) => (
      <FileCard
        name={file.originalName}
        extension={file.extension}
        size={file.size}
        onRemove={() => onRemoveClick(file.id)}
        onDownload={() => downloadFile(file)}
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
      searchPlaceholder="Search files..."
      emptyMessage="No files uploaded."
      itemsPerPage={8}
    />
  );
});

export { Files };
