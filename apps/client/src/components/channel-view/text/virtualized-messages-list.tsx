import type { TMessageGroup } from '@/features/server/messages/hooks';
import { cn } from '@/lib/utils';
import type { TJoinedMessage } from '@sharkord/shared';
import { forwardRef, memo, useMemo, useRef } from 'react';
import { Virtuoso, type Components, type VirtuosoHandle } from 'react-virtuoso';
import { useVirtualizedScrollController } from './hooks/use-virtualized-scroll-controller';
import { MessagesGroup } from './messages-group';

type TVirtualizedMessagesListProps = {
  groups: TMessageGroup[];
  hasMore: boolean;
  fetching: boolean;
  loadMore: () => Promise<unknown>;
  onReplyMessageSelect?: (message: TJoinedMessage) => void;
  replyTargetMessageId?: number;
  virtuosoRef?: React.RefObject<VirtuosoHandle | null>;
};

const Scroller = memo(
  forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
    ({ children, className, ...props }, ref) => (
      <div
        {...props}
        ref={ref}
        data-messages-container
        className={cn(
          'flex-1 overflow-y-auto overflow-x-hidden p-2 animate-in fade-in duration-500',
          className
        )}
      >
        {children}
      </div>
    )
  )
) as Components['Scroller'];

const VirtualizedMessagesList = memo(
  ({
    groups,
    hasMore,
    fetching,
    loadMore,
    onReplyMessageSelect,
    replyTargetMessageId,
    virtuosoRef
  }: TVirtualizedMessagesListProps) => {
    const localVirtuosoRef = useRef<VirtuosoHandle>(null);
    const initialTopMostItemIndexRef = useRef<
      { index: number; align: 'end' } | undefined
    >(undefined);
    const activeVirtuosoRef = virtuosoRef ?? localVirtuosoRef;

    if (!initialTopMostItemIndexRef.current && groups.length > 0) {
      initialTopMostItemIndexRef.current = {
        index: groups.length - 1,
        align: 'end'
      };
    }

    const {
      firstItemIndex,
      onStartReached,
      onScrollerRefChange,
      onAtBottomStateChange
    } = useVirtualizedScrollController({
      groups,
      fetching,
      hasMore,
      loadMore,
      virtuosoRef: activeVirtuosoRef
    });

    const components = useMemo(() => ({ Scroller }), []);

    return (
      <Virtuoso
        ref={activeVirtuosoRef}
        data={groups}
        firstItemIndex={firstItemIndex}
        initialTopMostItemIndex={initialTopMostItemIndexRef.current}
        scrollerRef={onScrollerRefChange}
        atBottomThreshold={120}
        atBottomStateChange={onAtBottomStateChange}
        computeItemKey={(_, group) => group.key}
        startReached={onStartReached}
        overscan={300}
        increaseViewportBy={{ top: 400, bottom: 800 }}
        components={components}
        itemContent={(_, group) => (
          <div className="py-2">
            <MessagesGroup
              group={group.messages}
              onReplyMessageSelect={onReplyMessageSelect}
              replyTargetMessageId={replyTargetMessageId}
            />
          </div>
        )}
      />
    );
  }
);

export { VirtualizedMessagesList };
