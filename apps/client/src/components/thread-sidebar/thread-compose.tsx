import { MessageCompose } from '@/components/message-compose';
import { playSound } from '@/features/server/sounds/actions';
import { SoundType } from '@/features/server/types';
import { getTRPCClient } from '@/lib/trpc';
import type { TJoinedPublicUser } from '@sharkord/shared';
import { TYPING_MS, getTrpcError, linkifyHtml } from '@sharkord/shared';
import { throttle } from 'lodash-es';
import { memo, useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

type TThreadComposeProps = {
  parentMessageId: number;
  channelId: number;
  typingUsers: TJoinedPublicUser[];
};

const ThreadCompose = memo(
  ({ parentMessageId, channelId, typingUsers }: TThreadComposeProps) => {
    const [newMessage, setNewMessage] = useState('');

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
            content: linkifyHtml(message),
            channelId,
            files: files.map((f) => f.id),
            parentMessageId
          });

          playSound(SoundType.MESSAGE_SENT);
        } catch (error) {
          toast.error(getTrpcError(error, 'Failed to send reply'));
          return false;
        }

        setNewMessage('');
        return true;
      },
      [channelId, sendTypingSignal, parentMessageId]
    );

    return (
      <MessageCompose
        channelId={channelId}
        message={newMessage}
        onMessageChange={setNewMessage}
        onSend={onSend}
        onTyping={sendTypingSignal}
        typingUsers={typingUsers}
      />
    );
  }
);

export { ThreadCompose };
