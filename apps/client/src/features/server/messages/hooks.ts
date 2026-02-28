import type { IRootState } from '@/features/store';
import { getTRPCClient } from '@/lib/trpc';
import { DEFAULT_MESSAGES_LIMIT, type TJoinedMessage } from '@sharkord/shared';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { addMessages, addThreadMessages, clearThreadMessages } from './actions';
import {
  messagesByChannelIdSelector,
  parentMessageByIdSelector,
  threadMessagesByParentIdSelector
} from './selectors';

export const useMessagesByChannelId = (channelId: number) =>
  useSelector((state: IRootState) =>
    messagesByChannelIdSelector(state, channelId)
  );

const useGroupedMessages = (messages: TJoinedMessage[]) =>
  useMemo(() => {
    const grouped = messages.reduce((acc, message) => {
      const last = acc[acc.length - 1];

      if (!last) return [[message]];

      const lastMessage = last[last.length - 1];

      if (lastMessage.userId === message.userId) {
        const lastDate = lastMessage.createdAt;
        const currentDate = message.createdAt;
        const timeDifference = Math.abs(currentDate - lastDate) / 1000 / 60;

        if (timeDifference < 1) {
          last.push(message);
          return acc;
        }
      }

      return [...acc, [message]];
    }, [] as TJoinedMessage[][]);

    return grouped;
  }, [messages]);

type TFetchPage = (
  cursor: number | null
) => Promise<{ nextCursor: number | null }>;

// fetch a page of channel messages from the server
const fetchChannelMessagesPage = async (input: {
  channelId: number;
  cursor: number | null;
  limit: number;
  targetMessageId?: number;
}) => {
  const trpcClient = getTRPCClient();

  return trpcClient.messages.get.query(input);
};

// reverse (newest-first -> oldest-first) and store messages
const storeChannelMessages = (
  channelId: number,
  rawPage: TJoinedMessage[],
  opts?: { prepend?: boolean }
) => {
  const page = [...rawPage].reverse();

  addMessages(channelId, page, opts);
};

const getMessagesContainer = () =>
  document.querySelector('[data-messages-container]');

const findMessageElement = (messageId: number) =>
  getMessagesContainer()?.querySelector(`[data-message-id="${messageId}"]`) ??
  null;

const nextFrame = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

const highlightMessageElement = async (element: Element) => {
  // yield twice: once for layout, once for paint — ensures the browser
  // has fully laid out all newly inserted messages before we scroll
  await nextFrame();
  await nextFrame();

  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  element.classList.add('bg-secondary');

  setTimeout(() => {
    element.classList.remove('bg-secondary');
  }, 2000);
};

const waitForMessageElement = (
  messageId: number,
  timeoutMs = 3000
): Promise<Element | null> =>
  new Promise((resolve) => {
    const existing = findMessageElement(messageId);

    if (existing) {
      resolve(existing);
      return;
    }

    const container = getMessagesContainer();

    if (!container) {
      resolve(null);
      return;
    }

    const observer = new MutationObserver(() => {
      const element = findMessageElement(messageId);

      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });

    observer.observe(container, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeoutMs);
  });

const usePaginatedMessages = (
  messages: TJoinedMessage[],
  fetchPage: TFetchPage,
  options?: { initialLoading?: boolean }
) => {
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(
    options?.initialLoading ?? messages.length === 0
  );
  const [cursor, setCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchMessages = useCallback(
    async (cursorToFetch: number | null) => {
      setFetching(true);

      try {
        const { nextCursor } = await fetchPage(cursorToFetch);

        setCursor(nextCursor);
        setHasMore(nextCursor !== null);
      } finally {
        setFetching(false);
        setLoading(false);
      }
    },
    [fetchPage]
  );

  const loadMore = useCallback(async () => {
    if (fetching || !hasMore) return;

    await fetchMessages(cursor);
  }, [fetching, hasMore, cursor, fetchMessages]);

  const isEmpty = useMemo(
    () => !messages.length && !fetching,
    [messages.length, fetching]
  );

  const groupedMessages = useGroupedMessages(messages);

  const reset = useCallback(() => {
    setCursor(null);
    setHasMore(true);
    setLoading(true);
  }, []);

  return {
    fetching,
    loading,
    hasMore,
    messages,
    loadMore,
    cursor,
    groupedMessages,
    isEmpty,
    fetchMessages,
    reset
  };
};

export const useMessages = (channelId: number) => {
  const messages = useMessagesByChannelId(channelId);
  const inited = useRef(false);

  const fetchPage = useCallback(
    async (cursorToFetch: number | null) => {
      const { messages: rawPage, nextCursor } = await fetchChannelMessagesPage({
        channelId,
        cursor: cursorToFetch,
        limit: DEFAULT_MESSAGES_LIMIT
      });

      storeChannelMessages(channelId, rawPage, {
        prepend: cursorToFetch !== null
      });

      return { nextCursor };
    },
    [channelId]
  );

  const paginated = usePaginatedMessages(messages, fetchPage);

  useEffect(() => {
    if (inited.current) return;

    paginated.fetchMessages(null);

    inited.current = true;
  }, [paginated]);

  const scrollToMessage = useCallback(
    async (messageId: number) => {
      // check if the message is already rendered in the messages container
      const existing = findMessageElement(messageId);

      if (existing) {
        highlightMessageElement(existing);
        return;
      }

      // message not loaded yet — fetch all messages down to the target
      const { messages: rawPage } = await fetchChannelMessagesPage({
        channelId,
        cursor: null,
        limit: DEFAULT_MESSAGES_LIMIT,
        targetMessageId: messageId
      });

      storeChannelMessages(channelId, rawPage, { prepend: true });

      // wait for React to render the new messages into the DOM
      const element = await waitForMessageElement(messageId);

      if (element) {
        highlightMessageElement(element);
      }
    },
    [channelId]
  );

  return { ...paginated, scrollToMessage };
};

export const useThreadMessagesByParentId = (parentMessageId: number) =>
  useSelector((state: IRootState) =>
    threadMessagesByParentIdSelector(state, parentMessageId)
  );

export const useThreadMessages = (parentMessageId: number) => {
  const messages = useThreadMessagesByParentId(parentMessageId);

  const fetchPage = useCallback(
    async (cursorToFetch: number | null) => {
      const trpcClient = getTRPCClient();

      const { messages: page, nextCursor } =
        await trpcClient.messages.getThread.query({
          parentMessageId,
          cursor: cursorToFetch,
          limit: DEFAULT_MESSAGES_LIMIT
        });

      addThreadMessages(parentMessageId, page);

      return { nextCursor };
    },
    [parentMessageId]
  );

  const paginated = usePaginatedMessages(messages, fetchPage, {
    initialLoading: true
  });

  // fetch fresh data every time the thread is opened
  useEffect(() => {
    clearThreadMessages(parentMessageId);
    paginated.reset();
    paginated.fetchMessages(null);
  }, [parentMessageId]); // eslint-disable-line react-hooks/exhaustive-deps

  return paginated;
};

export const useParentMessage = (
  messageId: number | undefined,
  channelId: number | undefined
) =>
  useSelector((state: IRootState) =>
    messageId && channelId
      ? parentMessageByIdSelector(state, messageId, channelId)
      : undefined
  );
