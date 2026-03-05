import { logDebug } from '@/helpers/browser-logger';
import { getTRPCClient } from '@/lib/trpc';
import type { TJoinedMessage } from '@sharkord/shared';
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
      addMessages(message.channelId, [message], {}, true);
    },
    onError: (err) => console.error('onMessage subscription error:', err)
  });

  const onMessageUpdateSub = trpc.messages.onUpdate.subscribe(undefined, {
    onData: (message: TJoinedMessage) => {
      logDebug('[EVENTS] messages.onUpdate', { message });
      updateMessage(message.channelId, message);
    },
    onError: (err) => console.error('onMessageUpdate subscription error:', err)
  });

  const onMessageDeleteSub = trpc.messages.onDelete.subscribe(undefined, {
    onData: ({ messageId, channelId }) => {
      logDebug('[EVENTS] messages.onDelete', { messageId, channelId });
      deleteMessage(channelId, messageId);
    },
    onError: (err) => console.error('onMessageDelete subscription error:', err)
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
    onError: (err) => console.error('onMessageTyping subscription error:', err)
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
      onError: (err) =>
        console.error('onThreadReplyCountUpdate subscription error:', err)
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
