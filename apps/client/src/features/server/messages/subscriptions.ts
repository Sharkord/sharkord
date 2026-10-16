import { logDebug } from '@/helpers/browser-logger';
import { getTRPCClient } from '@/lib/trpc';
import type { TJoinedMessage } from '@sharkord/shared';
import { handleSubscriptionError } from '../subscription-error';
import {
  addMessages,
  addTypingUser,
  deleteMessage,
  updateMessage,
  updateReplyCount
} from './actions';

const subscribeToMessages = () => {
  const trpc = getTRPCClient();

  const onMessageSub = trpc.messages.onNew.subscribe(undefined, {
    onData: (message: TJoinedMessage) => {
      logDebug('[EVENTS] messages.onNew', { message });
      addMessages(message.channelId, [message], true);
    },
    onError: handleSubscriptionError('onMessage')
  });

  const onMessageUpdateSub = trpc.messages.onUpdate.subscribe(undefined, {
    onData: (message: TJoinedMessage) => {
      logDebug('[EVENTS] messages.onUpdate', { message });
      updateMessage(message.channelId, message);
    },
    onError: handleSubscriptionError('onMessageUpdate')
  });

  const onMessageDeleteSub = trpc.messages.onDelete.subscribe(undefined, {
    onData: ({ messageId, channelId }) => {
      logDebug('[EVENTS] messages.onDelete', { messageId, channelId });
      deleteMessage(channelId, messageId);
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
      addTypingUser(channelId, userId, parentMessageId);
    },
    onError: handleSubscriptionError('onMessageTyping')
  });

  const onThreadReplyCountUpdateSub =
    trpc.messages.onThreadReplyCountUpdate.subscribe(undefined, {
      onData: ({
        messageId,
        channelId,
        replyCount
      }: {
        messageId: number;
        channelId: number;
        replyCount: number;
      }) => {
        logDebug('[EVENTS] messages.onThreadReplyCountUpdate', {
          messageId,
          channelId,
          replyCount
        });
        updateReplyCount(channelId, messageId, replyCount);
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
