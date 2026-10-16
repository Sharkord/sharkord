import { logDebug } from '@/helpers/browser-logger';
import { getTRPCClient } from '@/lib/trpc';
import type { TJoinedMessage, TThreadSummary } from '@sharkord/shared';
import { getMessageConversation } from '../helpers';
import { handleSubscriptionError } from '../subscription-error';
import {
  addMessages,
  addTypingUser,
  deleteMessage,
  updateMessage,
  updateThreadSummary
} from './actions';

const subscribeToMessages = () => {
  const trpc = getTRPCClient();

  const onMessageSub = trpc.messages.onNew.subscribe(undefined, {
    onData: (message: TJoinedMessage) => {
      logDebug('[EVENTS] messages.onNew', { message });
      addMessages(getMessageConversation(message), [message], true);
    },
    onError: handleSubscriptionError('onMessage')
  });

  const onMessageUpdateSub = trpc.messages.onUpdate.subscribe(undefined, {
    onData: (message: TJoinedMessage) => {
      logDebug('[EVENTS] messages.onUpdate', { message });
      updateMessage(message);
    },
    onError: handleSubscriptionError('onMessageUpdate')
  });

  const onMessageDeleteSub = trpc.messages.onDelete.subscribe(undefined, {
    onData: ({ messageId, channelId, parentMessageId }) => {
      logDebug('[EVENTS] messages.onDelete', {
        messageId,
        channelId,
        parentMessageId
      });
      deleteMessage(
        getMessageConversation({ channelId, parentMessageId }),
        messageId
      );
    },
    onError: handleSubscriptionError('onMessageDelete')
  });

  const onMessageTypingSub = trpc.messages.onTyping.subscribe(undefined, {
    onData: ({
      userId,
      channelId,
      parentMessageId
    }: {
      userId: number;
      channelId: number;
      parentMessageId?: number;
    }) => {
      logDebug('[EVENTS] messages.onTyping', {
        userId,
        channelId,
        parentMessageId
      });
      addTypingUser({ channelId, parentMessageId }, userId);
    },
    onError: handleSubscriptionError('onMessageTyping')
  });

  const onThreadReplyCountUpdateSub =
    trpc.messages.onThreadReplyCountUpdate.subscribe(undefined, {
      onData: ({
        messageId,
        channelId,
        replyCount,
        replyUserIds
      }: TThreadSummary & {
        messageId: number;
        channelId: number;
      }) => {
        logDebug('[EVENTS] messages.onThreadReplyCountUpdate', {
          messageId,
          channelId,
          replyCount,
          replyUserIds
        });
        updateThreadSummary(channelId, messageId, {
          replyCount,
          replyUserIds
        });
      },
      onError: handleSubscriptionError('onThreadReplyCountUpdate')
    });

  return () => {
    onMessageSub.unsubscribe();
    onMessageUpdateSub.unsubscribe();
    onMessageDeleteSub.unsubscribe();
    onMessageTypingSub.unsubscribe();
    onThreadReplyCountUpdateSub.unsubscribe();
  };
};

export { subscribeToMessages };
