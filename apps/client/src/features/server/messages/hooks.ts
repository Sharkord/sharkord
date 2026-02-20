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

export const useMessages = (channelId: number) => {
  const messages = useMessagesByChannelId(channelId);
  const inited = useRef(false);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(messages.length === 0);
  const [cursor, setCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchMessages = useCallback(
    async (cursorToFetch: number | null) => {
      const trpcClient = getTRPCClient();

      setFetching(true);

      try {
        const { messages: rawPage, nextCursor } =
          await trpcClient.messages.get.query({
            channelId,
            cursor: cursorToFetch,
            limit: DEFAULT_MESSAGES_LIMIT
          });

        const page = [...rawPage].reverse();
        const existingIds = new Set(messages.map((m) => m.id));
        const filtered = page.filter((m) => !existingIds.has(m.id));

        if (cursorToFetch === null) {
          // initial load (latest page) — append (or replace if you prefer)
          addMessages(channelId, filtered);
        } else {
          // loading older messages -> they must go *before* current list
          addMessages(channelId, filtered, { prepend: true });
        }

        setCursor(nextCursor);
        setHasMore(
          nextCursor !== null && filtered.length === DEFAULT_MESSAGES_LIMIT
        );

        return { success: true };
      } finally {
        setFetching(false);
        setLoading(false);
      }
    },
    [channelId, messages]
  );

  const loadMore = useCallback(async () => {
    if (fetching || !hasMore) return;

    await fetchMessages(cursor);
  }, [fetching, hasMore, cursor, fetchMessages]);

  useEffect(() => {
    if (inited.current) return;

    fetchMessages(null);

    inited.current = true;
  }, [fetchMessages]);

  const isEmpty = useMemo(
    () => !messages.length && !fetching,
    [messages.length, fetching]
  );

  const groupedMessages = useGroupedMessages(messages);

  return {
    fetching,
    loading, // for initial load
    hasMore,
    messages,
    loadMore,
    cursor,
    groupedMessages,
    isEmpty
  };
};

export const useThreadMessagesByParentId = (parentMessageId: number) =>
  useSelector((state: IRootState) =>
    threadMessagesByParentIdSelector(state, parentMessageId)
  );

export const useThreadMessages = (parentMessageId: number) => {
  const messages = useThreadMessagesByParentId(parentMessageId);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchMessages = useCallback(
    async (cursorToFetch: number | null) => {
      const trpcClient = getTRPCClient();

      setFetching(true);

      try {
        const { messages: page, nextCursor } =
          await trpcClient.messages.getThread.query({
            parentMessageId,
            cursor: cursorToFetch,
            limit: DEFAULT_MESSAGES_LIMIT
          });

        // slice action will dedupe so we can safely add all messages from the page
        addThreadMessages(parentMessageId, page);

        setCursor(nextCursor);
        setHasMore(
          nextCursor !== null && page.length === DEFAULT_MESSAGES_LIMIT
        );

        return { success: true };
      } finally {
        setFetching(false);
        setLoading(false);
      }
    },
    [parentMessageId]
  );

  const loadMore = useCallback(async () => {
    if (fetching || !hasMore) return;

    await fetchMessages(cursor);
  }, [fetching, hasMore, cursor, fetchMessages]);

  // fetch fresh data every time the thread is opened
  useEffect(() => {
    clearThreadMessages(parentMessageId);
    setCursor(null);
    setHasMore(true);
    setLoading(true);
    fetchMessages(null);
  }, [parentMessageId]); // eslint-disable-line react-hooks/exhaustive-deps

  const isEmpty = useMemo(
    () => !messages.length && !fetching,
    [messages.length, fetching]
  );

  const groupedMessages = useGroupedMessages(messages);

  return {
    fetching,
    loading,
    hasMore,
    messages,
    loadMore,
    cursor,
    groupedMessages,
    isEmpty
  };
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
