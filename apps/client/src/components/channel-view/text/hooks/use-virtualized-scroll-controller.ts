import type { TMessageGroup } from '@/features/server/messages/hooks';
import type { TJoinedMessage } from '@sharkord/shared';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { VirtuosoHandle } from 'react-virtuoso';

type TUseVirtualizedScrollControllerProps = {
  groups: TMessageGroup[];
  fetching: boolean;
  hasMore: boolean;
  loadMore: () => Promise<unknown>;
  virtuosoRef: React.RefObject<VirtuosoHandle | null>;
};

type TUseVirtualizedScrollControllerReturn = {
  firstItemIndex: number;
  onStartReached: () => Promise<void>;
  onScrollerRefChange: (scroller: HTMLElement | Window | null) => void;
  onAtBottomStateChange: (isAtBottom: boolean) => void;
};

type TLatestMessageInfo = Pick<TJoinedMessage, 'id' | 'createdAt'>;

// start with a high value to leave room for prepending without immediately changing item indexes
const INITIAL_FIRST_ITEM_INDEX = 100000;
const BOTTOM_THRESHOLD = 120;

const getFirstMessageId = (groups: TMessageGroup[]) =>
  groups[0]?.messages[0]?.id;

const getLatestMessage = (
  groups: TMessageGroup[]
): TLatestMessageInfo | undefined => {
  const lastGroup = groups[groups.length - 1];
  const lastMessage = lastGroup?.messages[lastGroup.messages.length - 1];

  if (!lastMessage) {
    return undefined;
  }

  return {
    id: lastMessage.id,
    createdAt: lastMessage.createdAt
  };
};

const isNewerMessage = (
  next: TLatestMessageInfo,
  previous?: TLatestMessageInfo
) => {
  if (!previous) {
    return true;
  }

  if (next.createdAt !== previous.createdAt) {
    return next.createdAt > previous.createdAt;
  }

  return next.id > previous.id;
};

const useVirtualizedScrollController = ({
  groups,
  fetching,
  hasMore,
  loadMore,
  virtuosoRef
}: TUseVirtualizedScrollControllerProps): TUseVirtualizedScrollControllerReturn => {
  const firstItemIndexRef = useRef(INITIAL_FIRST_ITEM_INDEX);
  const previousFirstMessageIdRef = useRef<number | undefined>(undefined);
  const didInitialBottomScroll = useRef(false);
  const previousLatestMessageRef = useRef<TLatestMessageInfo | undefined>(
    undefined
  );
  const groupsLengthRef = useRef(0);
  const shouldStickToBottomRef = useRef(true);
  const loadingMoreRef = useRef(false);
  const scrollerElementRef = useRef<HTMLElement | null>(null);
  const scrollerResizeObserverRef = useRef<ResizeObserver | null>(null);
  const scrollRafRef = useRef<number | undefined>(undefined);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const initialScrollRafRef = useRef<number | undefined>(undefined);
  const initialShortTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const initialLongTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const latestMessage = useMemo(() => getLatestMessage(groups), [groups]);

  groupsLengthRef.current = groups.length;

  const scrollToBottom = useCallback(
    (behavior: 'auto' | 'smooth') => {
      const groupsLength = groupsLengthRef.current;

      if (!virtuosoRef.current || groupsLength === 0) {
        return;
      }

      virtuosoRef.current.scrollToIndex({
        index: groupsLength - 1,
        align: 'end',
        behavior
      });
    },
    [virtuosoRef]
  );

  const cancelScheduledScroll = useCallback(() => {
    if (scrollRafRef.current !== undefined) {
      cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = undefined;
    }

    if (scrollTimeoutRef.current !== undefined) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = undefined;
    }
  }, []);

  const cancelInitialBottomLockAttempts = useCallback(() => {
    if (initialScrollRafRef.current !== undefined) {
      cancelAnimationFrame(initialScrollRafRef.current);
      initialScrollRafRef.current = undefined;
    }

    if (initialShortTimeoutRef.current !== undefined) {
      clearTimeout(initialShortTimeoutRef.current);
      initialShortTimeoutRef.current = undefined;
    }

    if (initialLongTimeoutRef.current !== undefined) {
      clearTimeout(initialLongTimeoutRef.current);
      initialLongTimeoutRef.current = undefined;
    }
  }, []);

  const scheduleScrollToBottom = useCallback(
    (behavior: 'auto' | 'smooth') => {
      cancelScheduledScroll();
      scrollToBottom(behavior);

      scrollRafRef.current = requestAnimationFrame(() => {
        scrollToBottom(behavior);
      });

      scrollTimeoutRef.current = setTimeout(() => {
        scrollToBottom(behavior);
      }, 50);
    },
    [cancelScheduledScroll, scrollToBottom]
  );

  const attemptInitialBottomLock = useCallback(() => {
    if (
      didInitialBottomScroll.current ||
      fetching ||
      groupsLengthRef.current === 0 ||
      !virtuosoRef.current
    ) {
      return;
    }

    cancelInitialBottomLockAttempts();
    scrollToBottom('auto');

    initialScrollRafRef.current = requestAnimationFrame(() => {
      scrollToBottom('auto');
    });

    initialShortTimeoutRef.current = setTimeout(() => {
      scrollToBottom('auto');
    }, 50);

    initialLongTimeoutRef.current = setTimeout(() => {
      scrollToBottom('auto');
    }, 200);

    didInitialBottomScroll.current = true;
    shouldStickToBottomRef.current = true;
  }, [cancelInitialBottomLockAttempts, fetching, scrollToBottom, virtuosoRef]);

  const isNearBottom = useCallback((scrollerElement: HTMLElement) => {
    const distanceFromBottom =
      scrollerElement.scrollHeight -
      (scrollerElement.scrollTop + scrollerElement.clientHeight);

    return distanceFromBottom <= BOTTOM_THRESHOLD;
  }, []);

  const onScrollerScroll = useCallback(() => {
    const scrollerElement = scrollerElementRef.current;

    if (!scrollerElement) {
      return;
    }

    shouldStickToBottomRef.current = isNearBottom(scrollerElement);
  }, [isNearBottom]);

  const onScrollerAsyncContentLoaded = useCallback(() => {
    if (shouldStickToBottomRef.current) {
      scheduleScrollToBottom('auto');
    }
  }, [scheduleScrollToBottom]);

  const clearScrollerObservers = useCallback(() => {
    const scrollerElement = scrollerElementRef.current;

    if (scrollerElement) {
      scrollerElement.removeEventListener('scroll', onScrollerScroll);
      scrollerElement.removeEventListener(
        'load',
        onScrollerAsyncContentLoaded,
        true
      );
      scrollerElement.removeEventListener(
        'loadedmetadata',
        onScrollerAsyncContentLoaded,
        true
      );
      scrollerElement.removeEventListener(
        'loadeddata',
        onScrollerAsyncContentLoaded,
        true
      );
    }

    scrollerElementRef.current = null;

    if (scrollerResizeObserverRef.current) {
      scrollerResizeObserverRef.current.disconnect();
      scrollerResizeObserverRef.current = null;
    }
  }, [onScrollerAsyncContentLoaded, onScrollerScroll]);

  const onScrollerRefChange = useCallback(
    (scroller: HTMLElement | Window | null) => {
      clearScrollerObservers();

      if (!scroller || !('scrollTop' in scroller)) {
        return;
      }

      scrollerElementRef.current = scroller;
      shouldStickToBottomRef.current = isNearBottom(scroller);

      attemptInitialBottomLock();

      scroller.addEventListener('scroll', onScrollerScroll, { passive: true });
      scroller.addEventListener('load', onScrollerAsyncContentLoaded, true);
      scroller.addEventListener(
        'loadedmetadata',
        onScrollerAsyncContentLoaded,
        true
      );
      scroller.addEventListener(
        'loadeddata',
        onScrollerAsyncContentLoaded,
        true
      );

      const observer = new ResizeObserver(() => {
        if (shouldStickToBottomRef.current) {
          scheduleScrollToBottom('auto');
        }
      });

      observer.observe(scroller);
      scrollerResizeObserverRef.current = observer;
    },
    [
      clearScrollerObservers,
      attemptInitialBottomLock,
      isNearBottom,
      onScrollerAsyncContentLoaded,
      onScrollerScroll,
      scheduleScrollToBottom
    ]
  );

  const onStartReached = useCallback(async () => {
    if (loadingMoreRef.current || fetching || !hasMore) {
      return;
    }

    loadingMoreRef.current = true;

    try {
      await loadMore();
    } finally {
      loadingMoreRef.current = false;
    }
  }, [fetching, hasMore, loadMore]);

  const onAtBottomStateChange = useCallback((isAtBottom: boolean) => {
    if (isAtBottom) {
      shouldStickToBottomRef.current = true;
    }
  }, []);

  const firstItemIndex = useMemo(() => {
    if (groups.length === 0) {
      firstItemIndexRef.current = INITIAL_FIRST_ITEM_INDEX;
      previousFirstMessageIdRef.current = undefined;
      didInitialBottomScroll.current = false;
      previousLatestMessageRef.current = undefined;
      shouldStickToBottomRef.current = true;

      return INITIAL_FIRST_ITEM_INDEX;
    }

    const previousFirstMessageId = previousFirstMessageIdRef.current;

    if (previousFirstMessageId !== undefined) {
      const previousGroupIndex = groups.findIndex((group) =>
        group.messages.some((message) => message.id === previousFirstMessageId)
      );

      if (previousGroupIndex > 0) {
        firstItemIndexRef.current -= previousGroupIndex;
      }
    }

    previousFirstMessageIdRef.current = getFirstMessageId(groups);

    return firstItemIndexRef.current;
  }, [groups]);

  useEffect(() => {
    attemptInitialBottomLock();
  }, [attemptInitialBottomLock, groups.length]);

  useEffect(
    () => () => {
      cancelScheduledScroll();
      cancelInitialBottomLockAttempts();
      clearScrollerObservers();
    },
    [
      cancelInitialBottomLockAttempts,
      cancelScheduledScroll,
      clearScrollerObservers
    ]
  );

  useEffect(() => {
    if (!latestMessage) {
      previousLatestMessageRef.current = undefined;
      return;
    }

    const previousLatestMessage = previousLatestMessageRef.current;

    const hasNewLatestMessage = isNewerMessage(
      latestMessage,
      previousLatestMessage
    );

    if (!hasNewLatestMessage) {
      previousLatestMessageRef.current = latestMessage;
      return;
    }

    if (shouldStickToBottomRef.current) {
      scheduleScrollToBottom('smooth');
    }

    previousLatestMessageRef.current = latestMessage;
  }, [latestMessage, scheduleScrollToBottom]);

  return {
    firstItemIndex,
    onStartReached,
    onScrollerRefChange,
    onAtBottomStateChange
  };
};

export { useVirtualizedScrollController };
