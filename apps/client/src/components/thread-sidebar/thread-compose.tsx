import { MessageCompose } from '@/components/message-compose';
import { playSound } from '@/features/server/sounds/actions';
import { SoundType } from '@/features/server/types';
import { getTRPCClient } from '@/lib/trpc';
import type { TReplyTarget } from '@/types';
import type { TJoinedPublicUser } from '@sharkord/shared';
import {
  TYPING_MS,
  getTrpcError,
  prepareMessageHtml,
  type TJoinedMessage
} from '@sharkord/shared';
import { throttle } from 'lodash-es';
import { memo, useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

type TThreadComposeProps = {
  parentMessageId: number;
  channelId: number;
  typingUsers: TJoinedPublicUser[];
  replyingToMessage?: TJoinedMessage;
  onCancelReply?: () => void;
};

const ThreadCompose = memo(
  ({
    parentMessageId,
    channelId,
    typingUsers,
    replyingToMessage,
    onCancelReply
  }: TThreadComposeProps) => {
    const [newMessage, setNewMessage] = useState('');

    const replyTarget = useMemo<TReplyTarget | undefined>(() => {
      if (!replyingToMessage) {
        return undefined;
      }

      if (replyingToMessage.pluginId) {
        return { userId: null, pluginId: replyingToMessage.pluginId };
      }

      return { userId: replyingToMessage.userId, pluginId: null };
    }, [replyingToMessage]);

    const sendTypingSignal = useMemo(
      () =>
        throttle(async () => {
          const trpc = getTRPCClient();

          try {
            await trpc.messages.signalTyping.mutate({
              channelId,
              parentMessageId
            });
          } catch {
            // ignore
          }
        }, TYPING_MS),
      [channelId, parentMessageId]
    );

    const onSend = useCallback(
      async (message: string, files: { id: string }[]) => {
        sendTypingSignal.cancel();

        const trpc = getTRPCClient();

        try {
          await trpc.messages.send.mutate({
            content: prepareMessageHtml(message),
            channelId,
            files: files.map((f) => f.id),
            parentMessageId,
            replyToMessageId: replyingToMessage?.id
          });

          playSound(SoundType.MESSAGE_SENT);
        } catch (error) {
          toast.error(getTrpcError(error, 'Failed to send reply'));
          return false;
        }

        setNewMessage('');
        onCancelReply?.();
        return true;
      },
      [
        channelId,
        sendTypingSignal,
        parentMessageId,
        replyingToMessage?.id,
        onCancelReply
      ]
    );

    return (
      <MessageCompose
        channelId={channelId}
        message={newMessage}
        onMessageChange={setNewMessage}
        onSend={onSend}
        onTyping={sendTypingSignal}
        typingUsers={typingUsers}
        replyTarget={replyTarget}
        onCancelReply={onCancelReply}
      />
    );
  }
);

export { ThreadCompose };
