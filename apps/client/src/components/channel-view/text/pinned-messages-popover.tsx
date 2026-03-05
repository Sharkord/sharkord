import { RelativeTime } from '@/components/relative-time';
import { useSelectedChannelId } from '@/features/server/channels/hooks';
import { useUserById } from '@/features/server/users/hooks';
import { getTRPCClient } from '@/lib/trpc';
import { getTrpcError, type TJoinedMessage } from '@sharkord/shared';
import {
  IconButton,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Spinner,
  Tooltip
} from '@sharkord/ui';
import { format } from 'date-fns';
import { ArrowRight, Pin } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { MessagesGroup } from './messages-group';

type TPinnedMessageGroupWrapperProps = {
  message: TJoinedMessage;
  onScrollToMessage: (messageId: number) => void;
};

const PinnedMessageGroupWrapper = memo(
  ({ message, onScrollToMessage }: TPinnedMessageGroupWrapperProps) => {
    const group = useMemo(() => [message], [message]);
    const user = useUserById(message.pinnedBy ?? 0);
    const pinnedDate = message.pinnedAt ? new Date(message.pinnedAt) : null;

    return (
      <div className="rounded-lg border border-border/70 bg-card/60 p-2">
        <div className="mb-2 flex items-center justify-between rounded-md border border-border/50 bg-secondary/35 px-3 py-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Pin className="h-3.5 w-3.5 text-primary/80" />
            <span>
              Pinned by{' '}
              <span className="font-medium text-foreground">
                {user ? user.name : 'Unknown User'}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            {pinnedDate ? (
              <RelativeTime date={pinnedDate}>
                {(relativeTime) => (
                  <span
                    className="text-xs text-muted-foreground"
                    title={format(pinnedDate, 'PPpp')}
                  >
                    {relativeTime}
                  </span>
                )}
              </RelativeTime>
            ) : (
              <span className="text-xs text-muted-foreground">
                Unknown time
              </span>
            )}
            <Tooltip content="Scroll to message">
              <IconButton
                icon={ArrowRight}
                size="xs"
                onClick={() => onScrollToMessage(message.id)}
              />
            </Tooltip>
          </div>
        </div>
        <MessagesGroup
          group={group}
          disableActions
          disableFiles
          disableReactions
        />
      </div>
    );
  }
);

type TPinnedMessagesPopoverProps = {
  onScrollToMessage: (messageId: number) => Promise<void>;
};

const PinnedMessagesPopover = memo(
  ({ onScrollToMessage }: TPinnedMessagesPopoverProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [pinnedMessages, setPinnedMessages] = useState<TJoinedMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const selectedChannelId = useSelectedChannelId();

    const togglePinnedMessages = useCallback(() => {
      setIsOpen((prev) => !prev);
    }, []);

    const handleScrollToMessage = useCallback(
      (messageId: number) => {
        setIsOpen(false);
        onScrollToMessage(messageId);
      },
      [onScrollToMessage]
    );

    useEffect(() => {
      if (!isOpen || !selectedChannelId) return;

      let isCancelled = false;

      const loadPinnedMessages = async () => {
        setLoading(true);

        const trpc = getTRPCClient();

        try {
          const messages = await trpc.messages.getPinned.query({
            channelId: selectedChannelId
          });

          if (!isCancelled) {
            setPinnedMessages(messages);
          }
        } catch (error) {
          if (!isCancelled) {
            toast.error(getTrpcError(error, 'Failed to load pinned messages'));
          }
        } finally {
          if (!isCancelled) {
            setLoading(false);
          }
        }
      };

      loadPinnedMessages();

      return () => {
        isCancelled = true;
      };
    }, [isOpen, selectedChannelId]);

    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <IconButton icon={Pin} size="sm" onClick={togglePinnedMessages} />
        </PopoverTrigger>
        <PopoverContent
          align="end"
          side="bottom"
          className="w-120 max-h-120 overflow-auto"
        >
          <div className="px-4 py-2 font-semibold">Pinned Messages</div>
          {loading ? (
            <div className="p-4">
              <Spinner size="xs" />
            </div>
          ) : (
            <div className="p-2">
              {pinnedMessages.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">
                  No pinned messages
                </div>
              ) : (
                <div className="space-y-2">
                  {pinnedMessages.map((message) => (
                    <PinnedMessageGroupWrapper
                      key={message.id}
                      message={message}
                      onScrollToMessage={handleScrollToMessage}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </PopoverContent>
      </Popover>
    );
  }
);

export { PinnedMessagesPopover };
