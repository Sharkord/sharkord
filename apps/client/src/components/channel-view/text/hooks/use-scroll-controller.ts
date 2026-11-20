import { useCallback, useEffect, useRef } from 'react';

// TODO: this might be improved in the future

type TUseScrollControllerProps = {
  messages: unknown[];
  fetching: boolean;
  hasMore: boolean;
  loadMore: () => Promise<unknown>;
  hasTypingUsers?: boolean;
};

type TUseScrollControllerReturn = {
  containerRef: React.RefObject<HTMLDivElement | null>;
  onScroll: () => void;
  scrollToBottom: () => void;
  isAtBottom: () => boolean;
};

const SCROLL_THRESHOLD = 80;

const useScrollController = ({
  messages,
  fetching,
  hasMore,
  loadMore,
  hasTypingUsers = false
}: TUseScrollControllerProps): TUseScrollControllerReturn => {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasInitialScroll = useRef(false);
  const shouldStickToBottom = useRef(true);
  const isProgrammaticScroll = useRef(false);
  const lastScrollTop = useRef(0);

  const isNearBottom = useCallback((container: HTMLDivElement) => {
    const distanceFromBottom =
      container.scrollHeight - (container.scrollTop + container.clientHeight);

    return distanceFromBottom <= 120;
  }, []);

  // scroll to bottom function
  const scrollToBottom = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    isProgrammaticScroll.current = true;
    container.scrollTop = container.scrollHeight;

    requestAnimationFrame(() => {
      isProgrammaticScroll.current = false;
    });
  }, []);

  // detect scroll-to-top and load more messages
  const onScroll = useCallback(() => {
    const container = containerRef.current;

    if (!container) return;

    const movedDown = container.scrollTop >= lastScrollTop.current;

    lastScrollTop.current = container.scrollTop;

    if (isProgrammaticScroll.current) return;

    // scroll anchoring pushes scrollTop down when content above the viewport grows, and the
    // browser dispatches that scroll before the resize observer gets to re-pin the bottom.
    // read as a position it looks like the user left, so only an upward move releases the lock
    shouldStickToBottom.current =
      isNearBottom(container) || (shouldStickToBottom.current && movedDown);

    if (fetching) return;

    if (container.scrollTop <= SCROLL_THRESHOLD && hasMore) {
      const previousDistanceFromEnd =
        container.scrollHeight - container.scrollTop;

      loadMore().then(() => {
        container.scrollTop = container.scrollHeight - previousDistanceFromEnd;
        shouldStickToBottom.current = isNearBottom(container);
      });
    }
  }, [loadMore, hasMore, fetching, isNearBottom]);

  // Handle initial scroll after messages load
  useEffect(() => {
    if (!containerRef.current) return;
    if (fetching || messages.length === 0) return;

    if (hasInitialScroll.current) return;

    scrollToBottom();
    hasInitialScroll.current = true;
    shouldStickToBottom.current = true;
  }, [fetching, messages.length, scrollToBottom, containerRef]);

  // if user is already at the top when fetching completes
  // trigger another page load without requiring an extra scroll event
  useEffect(() => {
    const container = containerRef.current;

    if (!container || fetching || !hasMore) {
      return;
    }

    if (container.scrollTop <= SCROLL_THRESHOLD) {
      onScroll();
    }
  }, [fetching, hasMore, messages.length, onScroll]);

  // auto-scroll on new messages if user is near bottom
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !hasInitialScroll.current || messages.length === 0)
      return;

    if (!shouldStickToBottom.current) return;

    const timer = setTimeout(() => {
      scrollToBottom();
    }, 10);

    return () => clearTimeout(timer);
  }, [messages, hasTypingUsers, scrollToBottom]);

  // media keeps resizing messages long after they render (slow or proxied loads, failed
  // images collapsing, video metadata), so the bottom lock follows every resize of the
  // list and of the container (composer height) for as long as they are mounted. fetching
  // is a dependency so the observer reattaches when a reload remounts the container
  const hasMessages = messages.length > 0;

  useEffect(() => {
    const container = containerRef.current;

    if (!container || !hasMessages) return;

    const observer = new ResizeObserver(() => {
      if (!shouldStickToBottom.current) return;

      scrollToBottom();
    });

    observer.observe(container);

    const content = container.firstElementChild;

    if (content) observer.observe(content);

    return () => {
      observer.disconnect();
    };
  }, [fetching, hasMessages, scrollToBottom]);

  const isAtBottom = useCallback(() => {
    const container = containerRef.current;

    if (!container) return true;

    return isNearBottom(container);
  }, [isNearBottom]);

  return {
    containerRef,
    onScroll,
    scrollToBottom,
    isAtBottom
  };
};

export { useScrollController };
