import {
  MessageCompose,
  type TMessageComposeHandle
} from '@/components/message-compose';
import {
  useChannelCan,
  useTypingUsersByChannelId
} from '@/features/server/hooks';
import { useMessages } from '@/features/server/messages/hooks';
import { playSound } from '@/features/server/sounds/actions';
import { SoundType } from '@/features/server/types';
import { getTRPCClient } from '@/lib/trpc';
import type { TReplyTarget } from '@/types';
import {
  ChannelPermission,
  TYPING_MS,
  getTrpcError,
  prepareMessageHtml,
  type TJoinedMessage
} from '@sharkord/shared';
import { Spinner } from '@sharkord/ui';
import { throttle } from 'lodash-es';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useScrollController } from './hooks/use-scroll-controller';
import { useScrollToJumpTarget } from './hooks/use-scroll-to-jump-target';
import { MessagesGroup } from './messages-group';
import { TextSkeleton } from './text-skeleton';
import { TextTopbar } from './text-top-bar';
import {
  getChannelDraftKey,
  getDraftMessage,
  setDraftMessage
} from './use-draft-messages';

type TChannelProps = {
  channelId: number;
  onClose?: () => void;
};

const TextChannel = memo(({ channelId, onClose }: TChannelProps) => {
  const { t } = useTranslation();
  const {
    messages,
    hasMore,
    loadMore,
    loading,
    fetching,
    groupedMessages,
    scrollToMessage
  } = useMessages(channelId);

  useScrollToJumpTarget(channelId, scrollToMessage);

  const draftChannelKey = getChannelDraftKey(channelId);

  const [newMessage, setNewMessage] = useState(
    getDraftMessage(draftChannelKey)
  );
  const [replyingToMessage, setReplyingToMessage] = useState<
    TJoinedMessage | undefined
  >();
  const typingUsers = useTypingUsersByChannelId(channelId);
  const composeRef = useRef<TMessageComposeHandle>(null);

  const replyTarget = useMemo<TReplyTarget | undefined>(() => {
    if (!replyingToMessage) {
      return undefined;
    }

    if (replyingToMessage.pluginId) {
      return { userId: null, pluginId: replyingToMessage.pluginId };
    }

    return { userId: replyingToMessage.userId, pluginId: null };
  }, [replyingToMessage]);

  const { containerRef, onScroll, onAsyncContentLoaded } = useScrollController({
    messages,
    fetching,
    hasMore,
    loadMore,
    hasTypingUsers: typingUsers.length > 0
  });

  const channelCan = useChannelCan(channelId);

  const sendTypingSignal = useMemo(
    () =>
      throttle(async () => {
        const trpc = getTRPCClient();

        try {
          await trpc.messages.signalTyping.mutate({ channelId });
        } catch {
          // ignore
        }
      }, TYPING_MS),
    [channelId]
  );

  const setNewMessageHandler = useCallback(
    (value: string) => {
      setNewMessage(value);
      setDraftMessage(draftChannelKey, value);
    },
    [setNewMessage, draftChannelKey]
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
          replyToMessageId: replyingToMessage?.id
        });

        playSound(SoundType.MESSAGE_SENT);
      } catch (error) {
        toast.error(getTrpcError(error, t('failedSendMessage')));
        return false;
      }

      setNewMessageHandler('');
      setReplyingToMessage(undefined);

      return true;
    },
    [
      channelId,
      sendTypingSignal,
      setNewMessageHandler,
      t,
      replyingToMessage?.id
    ]
  );

  const onReplyMessageSelect = useCallback((message: TJoinedMessage) => {
    setReplyingToMessage(message);
  }, []);

  if (!channelCan(ChannelPermission.VIEW_CHANNEL) || loading) {
    return <TextSkeleton />;
  }

  return (
    <>
      {fetching && (
        <div className="absolute top-0 left-0 right-0 h-12 z-10 flex items-center justify-center">
          <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm border border-border rounded-full px-4 py-2 shadow-lg">
            <Spinner size="xs" />
            <span className="text-sm text-muted-foreground">
              Fetching older messages...
            </span>
          </div>
        </div>
      )}

      <TextTopbar
        onScrollToMessage={scrollToMessage}
        channelId={channelId}
        onClose={onClose}
      />

      <div
        ref={containerRef}
        onScroll={onScroll}
        onLoadCapture={onAsyncContentLoaded}
        data-messages-container
        className="flex-1 overflow-y-auto overflow-x-hidden p-2 animate-in fade-in duration-500"
      >
        <div className="space-y-4">
          {groupedMessages.map((group, index) => (
            <MessagesGroup
              key={index}
              group={group}
              onReplyMessageSelect={onReplyMessageSelect}
              replyTargetMessageId={replyingToMessage?.id}
            />
          ))}
        </div>
      </div>

      <MessageCompose
        ref={composeRef}
        channelId={channelId}
        message={newMessage}
        onMessageChange={setNewMessageHandler}
        onSend={onSend}
        onTyping={sendTypingSignal}
        typingUsers={typingUsers}
        showPluginSlot
        onCancelReply={() => setReplyingToMessage(undefined)}
        replyTarget={replyTarget}
      />
    </>
  );
});

export { TextChannel };
