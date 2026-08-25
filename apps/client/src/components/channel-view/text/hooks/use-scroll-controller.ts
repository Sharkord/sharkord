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
  onAsyncContentLoaded: () => void;
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

    if (isProgrammaticScroll.current) return;

    shouldStickToBottom.current = isNearBottom(container);

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

    // content keeps growing after the first paint (images, embeds), so the
    // position is re-applied until the container stops resizing
    const performScroll = () => {
      scrollToBottom();
      hasInitialScroll.current = true;
      shouldStickToBottom.current = true;
    };

    performScroll();

    const container = containerRef.current;
    const observer = new ResizeObserver(() => {
      if (!shouldStickToBottom.current) return;

      scrollToBottom();
    });

    const content = container.firstElementChild;

    if (content) observer.observe(content);

    // ceiling: media that settles after this lands mid-scroll
    const stopObservingTimer = setTimeout(() => observer.disconnect(), 1000);

    // and the real window is shorter than 1s: messages.length is a dependency, so the next
    // message or page tears the observer down and the early return above blocks a new one
    return () => {
      observer.disconnect();
      clearTimeout(stopObservingTimer);
    };
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

  // keep bottom lock on container resize (input/footer height changes)
  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const observer = new ResizeObserver(() => {
      if (!shouldStickToBottom.current) {
        return;
      }

      scrollToBottom();
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [scrollToBottom]);

  // scroll to bottom when async content loads (e.g. metadata images)
  const onAsyncContentLoaded = useCallback(() => {
    if (shouldStickToBottom.current) {
      scrollToBottom();
    }
  }, [scrollToBottom]);

  const isAtBottom = useCallback(() => {
    const container = containerRef.current;

    if (!container) return true;

    return isNearBottom(container);
  }, [isNearBottom]);

  return {
    containerRef,
    onScroll,
    scrollToBottom,
    onAsyncContentLoaded,
    isAtBottom
  };
};

export { useScrollController };
