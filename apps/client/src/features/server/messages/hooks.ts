import type { IRootState } from '@/features/store';
import { getTRPCClient } from '@/lib/trpc';
import type { TConversation, TConversationKey } from '@/types';
import {
  DEFAULT_MESSAGES_LIMIT,
  getTrpcError,
  type TJoinedMessage,
  type TMessagesCursor
} from '@sharkord/shared';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { toast } from 'sonner';
import { getConversationKey } from '../helpers';
import {
  addMessages,
  setConversationMessages,
  trimConversationMessages
} from './actions';
import {
  findMessageElement,
  highlightMessageElement,
  waitForMessageElement
} from './helpers';
import {
  isConversationDetachedSelector,
  messagesByConversationKeySelector,
  parentMessageByIdSelector
} from './selectors';

export const useMessagesByConversationKey = (
  conversationKey: TConversationKey
) =>
  useSelector((state: IRootState) =>
    messagesByConversationKeySelector(state, conversationKey)
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

// both routes return the same newest-first page, a thread only differs in which one is asked
const fetchConversationPage = async (
  { channelId, parentMessageId }: TConversation,
  input: {
    cursor: TMessagesCursor | null;
    limit: number;
    targetMessageId?: number;
  }
) => {
  const trpcClient = getTRPCClient();

  if (parentMessageId) {
    return trpcClient.messages.getThread.query({ parentMessageId, ...input });
  }

  return trpcClient.messages.get.query({ channelId, ...input });
};

// reverse (newest-first -> oldest-first) and store messages
// messages are merged chronologically by the reducer regardless of which end a page came
// from, so there is no ordering option to pass here
const storeConversationMessages = (
  conversation: TConversation,
  rawPage: TJoinedMessage[]
) => {
  const page = [...rawPage].reverse();

  addMessages(conversation, page);
};

const usePaginatedMessages = (
  messages: TJoinedMessage[],
  fetchPage: TFetchPage
) => {
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(messages.length === 0);
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

// a channel or a thread (pass parentMessageId)
export const useConversationMessages = (
  channelId: number,
  parentMessageId?: number
) => {
  const conversation = useMemo(
    () => ({ channelId, parentMessageId }),
    [channelId, parentMessageId]
  );
  const conversationKey = getConversationKey(conversation);
  const messages = useMessagesByConversationKey(conversationKey);
  const inited = useRef(false);
  const detachedFromPresent = useSelector((state: IRootState) =>
    isConversationDetachedSelector(state, conversationKey)
  );

  const fetchPage = useCallback(
    async (cursorToFetch: TMessagesCursor | null) => {
      const { messages: rawPage, nextCursor } = await fetchConversationPage(
        conversation,
        { cursor: cursorToFetch, limit: DEFAULT_MESSAGES_LIMIT }
      );

      storeConversationMessages(conversation, rawPage);

      return { nextCursor };
    },
    [conversation]
  );

  const paginated = usePaginatedMessages(messages, fetchPage);

  useEffect(() => {
    if (inited.current) return;

    paginated.fetchMessages(null);

    inited.current = true;
  }, [paginated]);

  useEffect(() => () => trimConversationMessages(conversation), [conversation]);

  const { applyCursor } = paginated;

  const scrollToMessage = useCallback(
    async (messageId: number, highlightTime = 4000) => {
      // check if the message is already rendered in the messages container
      const existing = findMessageElement(conversationKey, messageId);

      if (existing) {
        highlightMessageElement(existing, highlightTime);

        return;
      }

      const {
        messages: rawPage,
        nextCursor,
        hasNewer
      } = await fetchConversationPage(conversation, {
        cursor: null,
        limit: DEFAULT_MESSAGES_LIMIT,
        targetMessageId: messageId
      });

      if (hasNewer) {
        // the window stops short of the newest message, so merging it into the channel's
        // existing list would put a gap in the middle of what is rendered. replace instead and
        // let the banner offer the way back to the present
        setConversationMessages(conversation, [...rawPage].reverse(), true);
        applyCursor(nextCursor);
      } else if (detachedFromPresent) {
        // this window does reach the present, but the list it would merge into is an older
        // detached window, so merging splices two disjoint stretches of history together and
        // leaves the channel detached with no way back. replace and reattach instead
        setConversationMessages(conversation, [...rawPage].reverse(), false);
        applyCursor(nextCursor);
      } else {
        storeConversationMessages(conversation, rawPage);
      }

      const element = await waitForMessageElement(conversationKey, messageId);

      if (element) {
        highlightMessageElement(element, highlightTime);
      }
    },
    [conversation, conversationKey, applyCursor, detachedFromPresent]
  );

  const returnToPresent = useCallback(async () => {
    const { messages: rawPage, nextCursor } = await fetchConversationPage(
      conversation,
      { cursor: null, limit: DEFAULT_MESSAGES_LIMIT }
    );

    setConversationMessages(conversation, [...rawPage].reverse(), false);
    applyCursor(nextCursor);
  }, [conversation, applyCursor]);

  return {
    ...paginated,
    scrollToMessage,
    detachedFromPresent,
    returnToPresent
  };
};

export const useParentMessage = (messageId: number, channelId: number) => {
  const { t } = useTranslation('common');
  const storedMessage = useSelector((state: IRootState) =>
    parentMessageByIdSelector(state, messageId, channelId)
  );
  const [fetchedMessage, setFetchedMessage] = useState<TJoinedMessage>();

  // the threads view opens a thread without loading its channel, so the parent is fetched
  // on its own. it is not kept live, edits to it show once the thread is reopened
  useEffect(() => {
    if (storedMessage) return;

    let cancelled = false;

    const fetchParentMessage = async () => {
      try {
        const trpc = getTRPCClient();
        const message = await trpc.messages.getOne.query({ messageId });

        if (!cancelled) setFetchedMessage(message);
      } catch (error) {
        toast.error(getTrpcError(error, t('failedLoadParentMessage')));
      }
    };

    fetchParentMessage();

    return () => {
      cancelled = true;
    };
  }, [storedMessage, messageId, t]);

  if (storedMessage) return storedMessage;

  return fetchedMessage?.id === messageId ? fetchedMessage : undefined;
};
