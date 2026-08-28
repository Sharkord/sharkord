import { TypingDots } from '@/components/typing-dots';
import {
  useChannelById,
  useChannelsByCategoryId,
  useCurrentVoiceChannelId,
  useSelectedChannelId
} from '@/features/server/channels/hooks';
import {
  useCan,
  useChannelCan,
  useHasSharingScreenUsers,
  useHasUnreadMentions,
  useTypingUsersByChannelId,
  useUnreadMessagesCount,
  useVoiceUsersByChannelId
} from '@/features/server/hooks';
import { useVoiceChannelExternalStreamsList } from '@/features/server/voice/hooks';
import { useSelectChannel } from '@/hooks/use-select-channel';
import { getTRPCClient } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChannelPermission,
  Permission,
  type TChannel,
  TestId,
  getTrpcError
} from '@sharkord/shared';
import { Hash, Volume2 } from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ChannelContextMenu } from '../context-menus/channel';
import { UnreadCount } from '../unread-count';
import { ExternalStream } from './external-stream';
import {
  VOICE_USER_DND_MIME,
  applyChannelDragPreview,
  categoryDropDndId,
  channelDndId
} from './helpers';
import { useChannelDragPreview } from './use-sidebar-dnd';
import { VoiceUser } from './voice-user';
import { Waveform } from './waveform';

type TVoiceProps = Omit<TItemWrapperProps, 'children'> & {
  channel: TChannel;
};

const Voice = memo(
  ({
    channel,
    isSelected,
    ...props
  }: TVoiceProps & { isSelected: boolean }) => {
    const { t } = useTranslation('sidebar');
    const users = useVoiceUsersByChannelId(channel.id);
    const externalStreams = useVoiceChannelExternalStreamsList(channel.id);
    const unreadCount = useUnreadMessagesCount(channel.id);
    const hasUnreadMentions = useHasUnreadMentions(channel.id);
    const currentVoiceChannelId = useCurrentVoiceChannelId();
    const someoneIsSharingScreen = useHasSharingScreenUsers(channel.id);

    const [isDragOver, setIsDragOver] = useState(false);

    const isVoiceActive = users.length > 0 || externalStreams.length > 0;
    const isOwnChannel = currentVoiceChannelId === channel.id;

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
      if (!e.dataTransfer.types.includes(VOICE_USER_DND_MIME)) return;

      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback(() => setIsDragOver(false), []);

    const handleDrop = useCallback(
      async (e: React.DragEvent<HTMLDivElement>) => {
        setIsDragOver(false);

        const raw = e.dataTransfer.getData(VOICE_USER_DND_MIME);

        if (!raw) return;

        e.preventDefault();

        const userId = Number(raw);

        if (!userId || users.some((user) => user.id === userId)) return;

        try {
          const trpc = getTRPCClient();

          await trpc.voice.moveUser.mutate({ userId, channelId: channel.id });
        } catch (error) {
          toast.error(getTrpcError(error, t('failedMoveUser')));
        }
      },
      [channel.id, users, t]
    );

    return (
      <>
        <ItemWrapper
          {...props}
          isSelected={isSelected}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(props.className, {
            'text-blue-500':
              someoneIsSharingScreen && (isOwnChannel || isSelected),
            'text-green-500':
              (isOwnChannel && !someoneIsSharingScreen) ||
              (isSelected &&
                !someoneIsSharingScreen &&
                !isOwnChannel &&
                isVoiceActive),
            'ring-1 ring-primary bg-accent/40': isDragOver
          })}
        >
          {isVoiceActive ? (
            <Waveform isScreenSharing={someoneIsSharingScreen} />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}

          <span className="flex-1 truncate">{channel.name}</span>

          {unreadCount > 0 && (
            <UnreadCount count={unreadCount} hasMention={hasUnreadMentions} />
          )}
        </ItemWrapper>
        {channel.type === 'VOICE' && (
          <div
            className="ml-6 space-y-1 mt-1"
            onContextMenu={(e) => e.stopPropagation()}
          >
            {users.map((user) => (
              <VoiceUser
                key={user.id}
                userId={user.id}
                user={user}
                isOwnChannel={isOwnChannel}
              />
            ))}
            {externalStreams.map((stream) => (
              <ExternalStream
                key={stream.streamId}
                title={stream.title}
                tracks={stream.tracks}
                pluginId={stream.pluginId}
                streamKey={stream.key}
                avatarUrl={stream.avatarUrl}
                isOwnChannel={isOwnChannel}
              />
            ))}
          </div>
        )}
      </>
    );
  }
);

type TTextProps = Omit<TItemWrapperProps, 'children'> & {
  channel: TChannel;
};

const Text = memo(({ channel, ...props }: TTextProps) => {
  const typingUsers = useTypingUsersByChannelId(channel.id);
  const unreadCount = useUnreadMessagesCount(channel.id);
  const hasUnreadMessages = useHasUnreadMentions(channel.id);
  const hasTypingUsers = typingUsers.length > 0;

  return (
    <ItemWrapper {...props}>
      <Hash className="h-4 w-4" />
      <span className="flex-1">{channel.name}</span>
      {hasTypingUsers && (
        <div className="flex items-center gap-0.5 ml-auto">
          <TypingDots className="space-x-0.5" />
        </div>
      )}
      {!hasTypingUsers && unreadCount > 0 && (
        <UnreadCount count={unreadCount} hasMention={hasUnreadMessages} />
      )}
    </ItemWrapper>
  );
});

type TItemWrapperProps = {
  children: React.ReactNode;
  className?: string;
  isSelected: boolean;
  onClick: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  style?: React.CSSProperties;
  disabled?: boolean;
  onDragOver?: React.DragEventHandler<HTMLDivElement>;
  onDragLeave?: React.DragEventHandler<HTMLDivElement>;
  onDrop?: React.DragEventHandler<HTMLDivElement>;
};

const ItemWrapper = memo(
  ({
    children,
    isSelected,
    onClick,
    className,
    dragHandleProps,
    style,
    disabled = false,
    onDragOver,
    onDragLeave,
    onDrop
  }: TItemWrapperProps) => {
    return (
      <div
        {...dragHandleProps}
        data-testid={TestId.CHANNEL_ITEM}
        style={style}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          'flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground select-none cursor-pointer',
          {
            'bg-accent text-accent-foreground': isSelected,
            'cursor-default opacity-50 hover:bg-transparent hover:text-muted-foreground':
              disabled
          },
          className
        )}
        onClick={disabled ? undefined : onClick}
      >
        {children}
      </div>
    );
  }
);

type TChannelProps = {
  channelId: number;
  categoryId: number;
  isSelected: boolean;
  onSelect: (channelId: number) => void;
};

const Channel = memo(
  ({ channelId, categoryId, isSelected, onSelect }: TChannelProps) => {
    const onClick = useCallback(
      () => onSelect(channelId),
      [onSelect, channelId]
    );

    const channel = useChannelById(channelId);
    const channelCan = useChannelCan(channelId);
    const can = useCan();
    const currentVoiceChannelId = useCurrentVoiceChannelId();

    const isConnectedVoiceChannel = currentVoiceChannelId === channelId;

    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging
    } = useSortable({
      id: channelDndId(channelId),
      data: { type: 'channel', channelId, categoryId }
    });

    if (!channel) {
      return null;
    }

    if (
      !isConnectedVoiceChannel &&
      !channelCan(ChannelPermission.VIEW_CHANNEL) &&
      !can(Permission.MANAGE_CHANNELS)
    ) {
      return null;
    }

    return (
      <div
        ref={setNodeRef}
        style={{
          transform: CSS.Transform.toString(
            transform && { ...transform, x: 0 }
          ),
          transition,
          opacity: isDragging ? 0.5 : 1
        }}
      >
        <ChannelContextMenu channelId={channelId}>
          <div>
            {channel.type === 'TEXT' && (
              <Text
                channel={channel}
                isSelected={isSelected}
                onClick={onClick}
                dragHandleProps={{ ...attributes, ...listeners }}
              />
            )}
            {channel.type === 'VOICE' && (
              <Voice
                channel={channel}
                isSelected={isSelected}
                onClick={onClick}
                dragHandleProps={{ ...attributes, ...listeners }}
                disabled={
                  !isConnectedVoiceChannel &&
                  (!channelCan(ChannelPermission.JOIN) ||
                    !can(Permission.JOIN_VOICE_CHANNELS))
                }
              />
            )}
          </div>
        </ChannelContextMenu>
      </div>
    );
  }
);

type TChannelsProps = {
  categoryId: number;
};

const Channels = memo(({ categoryId }: TChannelsProps) => {
  const channels = useChannelsByCategoryId(categoryId);
  const selectedChannelId = useSelectedChannelId();
  const can = useCan();
  const dragPreview = useChannelDragPreview();

  const channelIds = useMemo(
    () =>
      applyChannelDragPreview(
        channels.map((channel) => channel.id),
        categoryId,
        dragPreview
      ),
    [channels, categoryId, dragPreview]
  );

  const sortableIds = useMemo(() => channelIds.map(channelDndId), [channelIds]);

  const onChannelClick = useSelectChannel();

  const isEmpty = channelIds.length === 0;

  // only an empty category needs a container droppable: with channels in it, the
  // container rect encloses them and closestCenter would resolve mid-list drops
  // to the container instead of the channel actually hovered
  const { setNodeRef, isOver } = useDroppable({
    id: categoryDropDndId(categoryId),
    data: { type: 'category-drop', categoryId },
    disabled: !isEmpty
  });

  return (
    <div
      ref={setNodeRef}
      className={cn('space-y-0.5 rounded', {
        'min-h-6': isEmpty,
        'bg-accent/40': isOver
      })}
    >
      <SortableContext
        items={sortableIds}
        strategy={verticalListSortingStrategy}
        disabled={!can(Permission.MANAGE_CHANNELS)}
      >
        {channelIds.map((channelId) => (
          <Channel
            key={channelId}
            channelId={channelId}
            categoryId={categoryId}
            isSelected={selectedChannelId === channelId}
            onSelect={onChannelClick}
          />
        ))}
      </SortableContext>
    </div>
  );
});

export { Channels };
