import {
  MessageCompose,
  type TMessageComposeHandle
} from '@/components/message-compose';
import { SoundType } from '@/features/server/types';
import { playSound } from '@/helpers/sounds';
import type { LocalStorageKey } from '@/helpers/storage';
import { useTypingSignal } from '@/hooks/use-typing-signal';
import { getTRPCClient } from '@/lib/trpc';
import type { TReplyTarget } from '@/types';
import type { TJoinedPublicUser } from '@sharkord/shared';
import {
  getTrpcError,
  prepareMessageHtml,
  type TJoinedMessage
} from '@sharkord/shared';
import { memo, useCallback, useMemo, useState, type Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

type TThreadComposeProps = {
  parentMessageId: number;
  channelId: number;
  typingUsers: TJoinedPublicUser[];
  replyingToMessage?: TJoinedMessage;
  onCancelReply?: () => void;
  onArrowUp?: () => void;
  ref?: Ref<TMessageComposeHandle>;
  composeContainerRef?: React.RefObject<HTMLDivElement | null>;
  inputStorageKey?: LocalStorageKey;
  inputDefaultMaxHeightVh?: number;
  onResize?: () => void;
};

const ThreadCompose = memo(
  ({
    parentMessageId,
    channelId,
    typingUsers,
    replyingToMessage,
    onCancelReply,
    onArrowUp,
    ref,
    composeContainerRef,
    inputStorageKey,
    inputDefaultMaxHeightVh,
    onResize
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

    const { t } = useTranslation();

    const sendTypingSignal = useTypingSignal(channelId, parentMessageId);

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
          toast.error(getTrpcError(error, t('failedSendReply')));
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
        onCancelReply,
        t
      ]
    );

    return (
      <MessageCompose
        ref={ref}
        channelId={channelId}
        message={newMessage}
        onMessageChange={setNewMessage}
        onSend={onSend}
        onTyping={sendTypingSignal}
        typingUsers={typingUsers}
        replyTarget={replyTarget}
        onCancelReply={onCancelReply}
        onArrowUp={onArrowUp}
        composeContainerRef={composeContainerRef}
        inputStorageKey={inputStorageKey}
        inputDefaultMaxHeightVh={inputDefaultMaxHeightVh}
        onResize={onResize}
        isThread={true}
      />
    );
  }
);

export { ThreadCompose };
