import { FileCard } from '@/components/channel-view/text/file-card';
import { PaginatedList } from '@/components/paginated-list';
import { requestConfirmation } from '@/features/dialogs/actions';
import { getFileUrl } from '@/helpers/get-file-url';
import { getTRPCClient } from '@/lib/trpc';
import type { TFile } from '@sharkord/shared';
import { getTrpcError } from '@sharkord/shared';
import { memo, useCallback } from 'react';
import { toast } from 'sonner';
import { useModViewContext } from '../context';

const searchFilter = (file: TFile, term: string) =>
  file.originalName.toLowerCase().includes(term.toLowerCase()) ||
  file.extension.toLowerCase().includes(term.toLowerCase());

const Files = memo(() => {
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
        toast.success('File deleted successfully');
      } catch (error) {
        toast.error(getTrpcError(error, 'Failed to delete file'));
      } finally {
        refetch();
      }
    },
    [refetch]
  );

  return (
    <PaginatedList items={files} itemsPerPage={12} searchFilter={searchFilter}>
      <PaginatedList.Search placeholder="Search files..." className="mb-2" />
      <PaginatedList.Empty className="text-xs">
        No files uploaded.
      </PaginatedList.Empty>
      <PaginatedList.List<TFile>
        className="flex flex-col gap-2"
        getItemKey={(file) => file.id}
      >
        {(file) => (
          <FileCard
            name={file.originalName}
            extension={file.extension}
            size={file.size}
            onRemove={() => onRemoveClick(file.id)}
            href={getFileUrl(file)}
          />
        )}
      </PaginatedList.List>
      <PaginatedList.Pagination className="mt-2" />
    </PaginatedList>
  );
});

export { Files };
