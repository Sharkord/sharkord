import { MessageRenderer } from '@/components/channel-view/text/renderer';
import { PaginatedList } from '@/components/paginated-list';
import type { TMessage } from '@sharkord/shared';
import { format } from 'date-fns';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useModViewContext } from '../context';

const Messages = memo(() => {
  const { t } = useTranslation();
  const { messages } = useModViewContext();

  const renderItem = useCallback(
    (message: TMessage) => (
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
    ),
    []
  );

  const searchFilter = useCallback(
    (message: TMessage, term: string) =>
      message.content?.toLowerCase().includes(term.toLowerCase()) ?? false,
    []
  );

  return (
    <PaginatedList
      items={messages}
      renderItem={renderItem}
      searchFilter={searchFilter}
      searchPlaceholder={t('placeholders.searchInMessage')}
      emptyMessage="No messages found."
      itemsPerPage={8}
    />
  );
});

export { Messages };
