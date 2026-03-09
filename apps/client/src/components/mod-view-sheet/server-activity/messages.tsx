import { MessageRenderer } from '@/components/channel-view/text/renderer';
import { PaginatedList } from '@/components/paginated-list';
import type { TMessage } from '@sharkord/shared';
import { format } from 'date-fns';
import { memo } from 'react';
import { useModViewContext } from '../context';

const searchFilter = (message: TMessage, term: string) =>
  message.content?.toLowerCase().includes(term.toLowerCase()) ?? false;

const Messages = memo(() => {
  const { messages } = useModViewContext();

  return (
    <PaginatedList
      items={messages}
      itemsPerPage={8}
      searchFilter={searchFilter}
    >
      <PaginatedList.Search
        placeholder="Search in messages..."
        className="mb-2"
      />
      <PaginatedList.Empty className="text-xs">
        No messages found.
      </PaginatedList.Empty>
      <PaginatedList.List<TMessage>
        className="flex flex-col gap-2"
        getItemKey={(message) => message.id}
      >
        {(message) => (
          <div className="py-2 px-1 border-b border-border last:border-0 bg-secondary/50 rounded-md">
            <span className="text-xs text-muted-foreground">
              {format(new Date(message.createdAt), 'PPpp')}
            </span>
            <MessageRenderer
              message={{
                ...message,
                files: [],
                reactions: []
              }}
            />
          </div>
        )}
      </PaginatedList.List>
      <PaginatedList.Pagination className="mt-2" />
    </PaginatedList>
  );
});

export { Messages };
