import {
  MessageCompose,
  type TMessageComposeHandle
} from '@/components/message-compose';
import { PinnedMessagesBox } from '@/components/pinned-messages-box';
import {
  useChannelCan,
  useTypingUsersByChannelId
} from '@/features/server/hooks';
import { useMessages } from '@/features/server/messages/hooks';
import { playSound } from '@/features/server/sounds/actions';
import { SoundType } from '@/features/server/types';
import { getTRPCClient } from '@/lib/trpc';
import {
  ChannelPermission,
  TYPING_MS,
  getTrpcError,
  linkifyHtml
} from '@sharkord/shared';
import { Spinner } from '@sharkord/ui';
import { throttle } from 'lodash-es';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { MessagesGroup } from './messages-group';
import { TextSkeleton } from './text-skeleton';
import {
  getChannelDraftKey,
  getDraftMessage,
  setDraftMessage
} from './use-draft-messages';
import { useScrollController } from './use-scroll-controller';

type TChannelProps = {
  channelId: number;
};

const TextChannel = memo(({ channelId }: TChannelProps) => {
  const { messages, hasMore, loadMore, loading, fetching, groupedMessages } =
    useMessages(channelId);

  const draftChannelKey = getChannelDraftKey(channelId);

  const [newMessage, setNewMessage] = useState(
    getDraftMessage(draftChannelKey)
  );
  const typingUsers = useTypingUsersByChannelId(channelId);
  const messageRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const composeRef = useRef<TMessageComposeHandle>(null);

  const { containerRef, onScroll } = useScrollController({
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
          content: linkifyHtml(message),
          channelId,
          files: files.map((f) => f.id)
        });

        playSound(SoundType.MESSAGE_SENT);
      } catch (error) {
        toast.error(getTrpcError(error, 'Failed to send message'));
        return false;
      }

      setNewMessageHandler('');
      return true;
    },
    [channelId, sendTypingSignal, setNewMessageHandler]
  );

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

      <PinnedMessagesBox messageRefs={messageRefs} messages={messages} />

      <div
        ref={containerRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden p-2 animate-in fade-in duration-500"
      >
        <div className="space-y-4">
          {groupedMessages.map((group, index) => (
            <MessagesGroup
              key={index}
              group={group}
              messageRefs={messageRefs}
              type="channel"
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
      />
    </>
  );
});

export { TextChannel };
