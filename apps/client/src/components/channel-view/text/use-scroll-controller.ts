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

  const isNearBottom = useCallback((container: HTMLDivElement) => {
    const distanceFromBottom =
      container.scrollHeight - (container.scrollTop + container.clientHeight);

    return distanceFromBottom <= 120;
  }, []);

  // scroll to bottom function
  const scrollToBottom = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    container.scrollTop = container.scrollHeight;
  }, []);

  // detect scroll-to-top and load more messages
  const onScroll = useCallback(() => {
    const container = containerRef.current;

    if (!container) return;

    shouldStickToBottom.current = isNearBottom(container);

    if (fetching) return;

    if (container.scrollTop <= SCROLL_THRESHOLD && hasMore) {
      const prevScrollHeight = container.scrollHeight;

      loadMore().then(() => {
        const newScrollHeight = container.scrollHeight;

        container.scrollTop =
          newScrollHeight - prevScrollHeight + container.scrollTop;
        shouldStickToBottom.current = isNearBottom(container);
      });
    }
  }, [loadMore, hasMore, fetching, isNearBottom]);

  // Handle initial scroll after messages load
  useEffect(() => {
    if (!containerRef.current) return;
    if (fetching || messages.length === 0) return;

    if (!hasInitialScroll.current) {
      // try multiple methods to ensure scroll happens after all content is rendered
      const performScroll = () => {
        scrollToBottom();
        hasInitialScroll.current = true;
        shouldStickToBottom.current = true;
      };

      // 1: immediate attempt
      performScroll();

      // 2: wait for next frame
      requestAnimationFrame(() => {
        performScroll();
      });

      // 3: short timeout for any async content
      setTimeout(() => {
        performScroll();
      }, 50);

      // 4: longer timeout for images and other media
      setTimeout(() => {
        performScroll();
      }, 200);
    }
  }, [fetching, messages.length, scrollToBottom]);

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

    if (shouldStickToBottom.current) {
      // scroll after a short delay to allow content to render
      setTimeout(() => {
        scrollToBottom();
      }, 10);
    }
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

  return {
    containerRef,
    onScroll,
    scrollToBottom
  };
};

export { useScrollController };
