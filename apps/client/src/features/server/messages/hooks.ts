import type { IRootState } from '@/features/store';
import { getTRPCClient } from '@/lib/trpc';
import {
  DEFAULT_MESSAGES_LIMIT,
  type TJoinedMessage,
  type TMessagesCursor
} from '@sharkord/shared';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  addMessages,
  addThreadMessages,
  clearThreadMessages,
  setChannelMessages,
  trimChannelMessages
} from './actions';
import {
  findMessageElement,
  highlightMessageElement,
  waitForMessageElement
} from './helpers';
import {
  isChannelDetachedSelector,
  messagesByChannelIdSelector,
  parentMessageByIdSelector,
  threadMessagesByParentIdSelector
} from './selectors';

export const useMessagesByChannelId = (channelId: number) =>
  useSelector((state: IRootState) =>
    messagesByChannelIdSelector(state, channelId)
  );

export type TMessageGroup = {
  key: string;
  messages: TJoinedMessage[];
};

const useGroupedMessages = (messages: TJoinedMessage[]) =>
  useMemo(() => {
    const grouped: TMessageGroup[] = [];

    for (const message of messages) {
      const lastGroup = grouped[grouped.length - 1];

      if (!lastGroup) {
        grouped.push({
          key: `${message.id}`,
          messages: [message]
        });

        continue;
      }

      const lastMessage = lastGroup.messages[lastGroup.messages.length - 1];

      const hasInlineReply =
        !!message.replyToMessageId || !!lastMessage.replyToMessageId;

      // if either the current or the last message is a reply, they should be in different groups to show the reply context clearly
      if (hasInlineReply) {
        grouped.push({
          key: `${message.id}`,
          messages: [message]
        });

        continue;
      }

      const sameAuthor = message.pluginId
        ? lastMessage.pluginId === message.pluginId
        : lastMessage.userId === message.userId;

      if (!sameAuthor) {
        grouped.push({
          key: `${message.id}`,
          messages: [message]
        });

        continue;
      }

      const lastDate = lastMessage.createdAt;
      const currentDate = message.createdAt;
      const timeDifference = Math.abs(currentDate - lastDate) / 1000 / 60;

      if (timeDifference < 1) {
        lastGroup.messages.push(message);

        continue;
      }

      grouped.push({
        key: `${message.id}`,
        messages: [message]
      });
    }

    return grouped;
  }, [messages]);

type TFetchPage = (
  cursor: TMessagesCursor | null
) => Promise<{ nextCursor: TMessagesCursor | null }>;

// fetch a page of channel messages from the server
const fetchChannelMessagesPage = async (input: {
  channelId: number;
  cursor: TMessagesCursor | null;
  limit: number;
  targetMessageId?: number;
}) => {
  const trpcClient = getTRPCClient();

  return trpcClient.messages.get.query(input);
};

// reverse (newest-first -> oldest-first) and store messages
// messages are merged chronologically by the reducer regardless of which end a page came
// from, so there is no ordering option to pass here
const storeChannelMessages = (channelId: number, rawPage: TJoinedMessage[]) => {
  const page = [...rawPage].reverse();

  addMessages(channelId, page);
};

const usePaginatedMessages = (
  messages: TJoinedMessage[],
  fetchPage: TFetchPage,
  options?: { initialLoading?: boolean }
) => {
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(
    options?.initialLoading ?? messages.length === 0
  );
  const [cursor, setCursor] = useState<TMessagesCursor | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchMessages = useCallback(
    async (cursorToFetch: TMessagesCursor | null) => {
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

  const applyCursor = useCallback((nextCursor: TMessagesCursor | null) => {
    setCursor(nextCursor);
    setHasMore(nextCursor !== null);
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
    applyCursor,
    reset
  };
};

export const useMessages = (channelId: number) => {
  const messages = useMessagesByChannelId(channelId);
  const inited = useRef(false);
  const detachedFromPresent = useSelector((state: IRootState) =>
    isChannelDetachedSelector(state, channelId)
  );

  const fetchPage = useCallback(
    async (cursorToFetch: TMessagesCursor | null) => {
      const { messages: rawPage, nextCursor } = await fetchChannelMessagesPage({
        channelId,
        cursor: cursorToFetch,
        limit: DEFAULT_MESSAGES_LIMIT
      });

      storeChannelMessages(channelId, rawPage);

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

  useEffect(() => () => trimChannelMessages(channelId), [channelId]);

  const { applyCursor } = paginated;

  const scrollToMessage = useCallback(
    async (messageId: number, highlightTime = 4000) => {
      // check if the message is already rendered in the messages container
      const existing = findMessageElement(messageId);

      if (existing) {
        highlightMessageElement(existing, highlightTime);

        return;
      }

      const {
        messages: rawPage,
        nextCursor,
        hasNewer
      } = await fetchChannelMessagesPage({
        channelId,
        cursor: null,
        limit: DEFAULT_MESSAGES_LIMIT,
        targetMessageId: messageId
      });

      if (hasNewer) {
        // the window stops short of the newest message, so merging it into the channel's
        // existing list would put a gap in the middle of what is rendered. replace instead and
        // let the banner offer the way back to the present
        setChannelMessages(channelId, [...rawPage].reverse(), true);
        applyCursor(nextCursor);
      } else if (detachedFromPresent) {
        // this window does reach the present, but the list it would merge into is an older
        // detached window, so merging splices two disjoint stretches of history together and
        // leaves the channel detached with no way back. replace and reattach instead
        setChannelMessages(channelId, [...rawPage].reverse(), false);
        applyCursor(nextCursor);
      } else {
        storeChannelMessages(channelId, rawPage);
      }

      const element = await waitForMessageElement(messageId);

      if (element) {
        highlightMessageElement(element, highlightTime);
      }
    },
    [channelId, applyCursor, detachedFromPresent]
  );

  const returnToPresent = useCallback(async () => {
    const { messages: rawPage, nextCursor } = await fetchChannelMessagesPage({
      channelId,
      cursor: null,
      limit: DEFAULT_MESSAGES_LIMIT
    });

    setChannelMessages(channelId, [...rawPage].reverse(), false);
    applyCursor(nextCursor);
  }, [channelId, applyCursor]);

  return {
    ...paginated,
    scrollToMessage,
    detachedFromPresent,
    returnToPresent
  };
};

export const useThreadMessagesByParentId = (parentMessageId: number) =>
  useSelector((state: IRootState) =>
    threadMessagesByParentIdSelector(state, parentMessageId)
  );

export const useThreadMessages = (parentMessageId: number) => {
  const messages = useThreadMessagesByParentId(parentMessageId);

  const fetchPage = useCallback(
    async (cursorToFetch: TMessagesCursor | null) => {
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
