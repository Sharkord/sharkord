import { useCallback, useEffect, useRef } from 'react';

// TODO: this might be improved in the future

type TUseScrollControllerProps = {
  messages: unknown[];
  fetching: boolean;
  hasMore: boolean;
  loadMore: () => Promise<unknown>;
};

type TUseScrollControllerReturn = {
  containerRef: React.RefObject<HTMLDivElement | null>;
  onScroll: () => void;
  scrollToBottom: () => void;
};

const useScrollController = ({
  messages,
  fetching,
  hasMore,
  loadMore
}: TUseScrollControllerProps): TUseScrollControllerReturn => {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasInitialScroll = useRef(false);

  // scroll to bottom function
  const scrollToBottom = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    container.scrollTop = container.scrollHeight;
  }, []);

  // detect scroll-to-top and load more messages
  const onScroll = useCallback(() => {
    const container = containerRef.current;

    if (!container || fetching) return;

    if (container.scrollTop <= 50 && hasMore) {
      const prevScrollHeight = container.scrollHeight;

      loadMore().then(() => {
        const newScrollHeight = container.scrollHeight;
        container.scrollTop =
          newScrollHeight - prevScrollHeight + container.scrollTop;
      });
    }
  }, [loadMore, hasMore, fetching]);

  // Handle initial scroll after messages load
  useEffect(() => {
    if (!containerRef.current) return;
    if (fetching || messages.length === 0) return;

    if (!hasInitialScroll.current) {
      // try multiple methods to ensure scroll happens after all content is rendered
      const performScroll = () => {
        scrollToBottom();
        hasInitialScroll.current = true;
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

  // auto-scroll on new messages if user is near bottom
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !hasInitialScroll.current || messages.length === 0)
      return;

    // Check if user is near bottom
    const scrollPosition = container.scrollTop + container.clientHeight;
    const threshold = container.scrollHeight * 0.9; // 90% of scroll height

    if (scrollPosition >= threshold) {
      // scroll after a short delay to allow content to render
      setTimeout(() => {
        scrollToBottom();
      }, 10);
    }
  }, [messages, scrollToBottom]);

  return {
    containerRef,
    onScroll,
    scrollToBottom
  };
};

export { useScrollController };
