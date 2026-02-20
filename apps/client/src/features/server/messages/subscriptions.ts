import { getTRPCClient } from '@/lib/trpc';
import type { TJoinedMessage } from '@sharkord/shared';
import {
  addMessages,
  addTypingUser,
  deleteMessage,
  updateMessage
} from './actions';

const subscribeToMessages = () => {
  const trpc = getTRPCClient();

  const onMessageSub = trpc.messages.onNew.subscribe(undefined, {
    onData: (message: TJoinedMessage) =>
      addMessages(message.channelId, [message], {}, true),
    onError: (err) => console.error('onMessage subscription error:', err)
  });

  const onMessageUpdateSub = trpc.messages.onUpdate.subscribe(undefined, {
    onData: (message: TJoinedMessage) =>
      updateMessage(message.channelId, message),
    onError: (err) => console.error('onMessageUpdate subscription error:', err)
  });

  const onMessageDeleteSub = trpc.messages.onDelete.subscribe(undefined, {
    onData: ({ messageId, channelId }) => deleteMessage(channelId, messageId),
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
      addTypingUser(channelId, userId, parentMessageId);
    },
    onError: (err) => console.error('onMessageTyping subscription error:', err)
  });

  return () => {
    onMessageSub.unsubscribe();
    onMessageUpdateSub.unsubscribe();
    onMessageDeleteSub.unsubscribe();
    onMessageTypingSub.unsubscribe();
  };
};

export { subscribeToMessages };
