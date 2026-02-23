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
import {
  ChannelPermission,
  TYPING_MS,
  getTrpcError,
  linkifyHtml
} from '@sharkord/shared';
import { Spinner } from '@sharkord/ui';
import { throttle } from 'lodash-es';
import { Paperclip, Send } from 'lucide-react';
import { memo, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { MessagesGroup } from './messages-group';
import { TextSkeleton } from './text-skeleton';
import {
  getChannelDraftKey,
  getDraftMessage,
  setDraftMessage
} from './use-draft-messages';
import { useScrollController } from './use-scroll-controller';
import { UsersTyping } from './users-typing';
import { cn } from '@/lib/utils';
import { PinnedMessagesTopbar } from '@/components/pinned-messages-topbar';
import { PinnedMessageContext } from '@/components/pinned-message-provider';

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
  const pinnedMessageContext = useContext(PinnedMessageContext);
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

      <PinnedMessagesTopbar 
        className={cn(
          'absolute left-2 right-2 w-auto transition-[height,padding,opacity] duration-500 ease-in-out overflow-hidden',
          'bg-neutral-800 rounded-xl shadow-md border border-neutral-700 mx-2 mt-2',
          'max-w-4xl mx-auto',
          pinnedMessageContext.visible ?
            'max-h-[85vh] h-auto p-2 opacity-100 z-10' :
            'h-0 p-0 opacity-0 border-transparent shadow-none'
        )}
        isOpen={pinnedMessageContext.visible || false}
        messageRefs={messageRefs}
        messages={messages}
      />

      <div
        ref={containerRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden p-2 animate-in fade-in duration-500"
      >
        <div className="space-y-4">
          {groupedMessages.map((group, index) => (
            <MessagesGroup key={index} group={group} messageRefs={messageRefs} type="channel" />
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
