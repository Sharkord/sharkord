import type { TMessageGroup } from '@/features/server/messages/hooks';
import { cn } from '@/lib/utils';
import type { TJoinedMessage } from '@sharkord/shared';
import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { Virtuoso, type Components, type VirtuosoHandle } from 'react-virtuoso';
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

// we start with a high number to leave room for prepending items without having to change the firstItemIndex immediately, which would cause a jump in the list
const INITIAL_FIRST_ITEM_INDEX = 100000;

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
    const [isAtBottom, setIsAtBottom] = useState(true);
    const firstItemIndexRef = useRef(INITIAL_FIRST_ITEM_INDEX);
    const previousFirstGroupKeyRef = useRef<string | undefined>(undefined);
    const didInitialBottomScroll = useRef(false);

    const onStartReached = useCallback(async () => {
      if (fetching || !hasMore) {
        return;
      }

      await loadMore();
    }, [fetching, hasMore, loadMore]);

    // compute firstItemIndex synchronously during render so that
    // react-virtuoso always receives a consistent data + firstItemIndex
    // pair on the same render pass, avoiding a one-frame jump.
    const firstItemIndex = useMemo(() => {
      if (groups.length === 0) {
        previousFirstGroupKeyRef.current = undefined;
        firstItemIndexRef.current = INITIAL_FIRST_ITEM_INDEX;
        didInitialBottomScroll.current = false;
        return INITIAL_FIRST_ITEM_INDEX;
      }

      const currentFirstKey = groups[0].key;
      const previousFirstKey = previousFirstGroupKeyRef.current;

      if (previousFirstKey) {
        const previousIndex = groups.findIndex(
          (group) => group.key === previousFirstKey
        );

        if (previousIndex > 0) {
          firstItemIndexRef.current -= previousIndex;
        }
      }

      previousFirstGroupKeyRef.current = currentFirstKey;
      return firstItemIndexRef.current;
    }, [groups]);

    const activeVirtuosoRef = virtuosoRef ?? localVirtuosoRef;

    useEffect(() => {
      if (
        groups.length === 0 ||
        fetching ||
        didInitialBottomScroll.current ||
        !activeVirtuosoRef.current
      ) {
        return;
      }

      const scrollToBottom = () => {
        activeVirtuosoRef.current?.scrollToIndex({
          index: groups.length - 1,
          align: 'end',
          behavior: 'auto'
        });
      };

      scrollToBottom();

      requestAnimationFrame(() => {
        scrollToBottom();
      });

      const timeoutOne = setTimeout(scrollToBottom, 200);
      const timeoutTwo = setTimeout(scrollToBottom, 900);

      didInitialBottomScroll.current = true;

      return () => {
        clearTimeout(timeoutOne);
        clearTimeout(timeoutTwo);
      };
    }, [activeVirtuosoRef, fetching, groups.length]);

    return (
      <Virtuoso
        ref={activeVirtuosoRef}
        data={groups}
        firstItemIndex={firstItemIndex}
        initialTopMostItemIndex={{
          index: Math.max(groups.length - 1, 0),
          align: 'end'
        }}
        atBottomStateChange={setIsAtBottom}
        followOutput={isAtBottom ? 'smooth' : false}
        computeItemKey={(_, group) => group.key}
        startReached={onStartReached}
        overscan={300}
        increaseViewportBy={{ top: 400, bottom: 800 }}
        components={{ Scroller }}
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
