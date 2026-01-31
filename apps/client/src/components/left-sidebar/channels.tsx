import { TypingDots } from '@/components/typing-dots';
import { setSelectedChannelId } from '@/features/server/channels/actions';
import {
  useChannelById,
  useChannelsByCategoryId,
  useCurrentVoiceChannelId,
  useSelectedChannelId
} from '@/features/server/channels/hooks';
import {
  useCan,
  useChannelCan,
  useTypingUsersByChannelId,
  useUnreadMessagesCount,
  useVoiceUsersByChannelId
} from '@/features/server/hooks';
import { joinVoice } from '@/features/server/voice/actions';
import {
  useVoice,
  useVoiceChannelExternalStreamsList
} from '@/features/server/voice/hooks';
import { getTrpcError } from '@/helpers/parse-trpc-errors';
import { getTRPCClient } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChannelPermission,
  ChannelType,
  Permission,
  type TChannel
} from '@sharkord/shared';
import { Hash, Volume2 } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { ChannelContextMenu } from '../context-menus/channel';
import { ExternalStream } from './external-stream';
import { VoiceUser } from './voice-user';

type TVoiceProps = Omit<TItemWrapperProps, 'children'> & {
  channel: TChannel;
};

const Voice = memo(({ channel, ...props }: TVoiceProps) => {
  const users = useVoiceUsersByChannelId(channel.id);
  const externalStreams = useVoiceChannelExternalStreamsList(channel.id);
  const unreadCount = useUnreadMessagesCount(channel.id);

  return (
    <>
      <ItemWrapper {...props}>
        <Volume2 className="h-4 w-4" />
        <span className="flex-1">{channel.name}</span>
        {unreadCount > 0 && (
          <div className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
      </ItemWrapper>
      {channel.type === 'VOICE' && (
        <div className="ml-6 space-y-1 mt-1">
          {users.map((user) => (
            <VoiceUser key={user.id} userId={user.id} user={user} />
          ))}
          {externalStreams.map((stream) => (
            <ExternalStream
              key={stream.streamId}
              title={stream.title}
              tracks={stream.tracks}
              pluginId={stream.pluginId}
              avatarUrl={stream.avatarUrl}
            />
          ))}
        </div>
      )}
    </>
  );
});

type TTextProps = Omit<TItemWrapperProps, 'children'> & {
  channel: TChannel;
};

const Text = memo(({ channel, ...props }: TTextProps) => {
  const typingUsers = useTypingUsersByChannelId(channel.id);
  const unreadCount = useUnreadMessagesCount(channel.id);
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
        <div className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
          {unreadCount > 99 ? '99+' : unreadCount}
        </div>
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
};

const ItemWrapper = memo(
  ({
    children,
    isSelected,
    onClick,
    className,
    dragHandleProps,
    style,
    disabled = false
  }: TItemWrapperProps) => {
    return (
      <div
        {...dragHandleProps}
        style={style}
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
  isSelected: boolean;
};

const Channel = memo(({ channelId, isSelected }: TChannelProps) => {
  const channel = useChannelById(channelId);
  const currentVoiceChannelId = useCurrentVoiceChannelId();
  const channelCan = useChannelCan(channelId);
  const can = useCan();
  const { init } = useVoice();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: channelId });

  const onClick = useCallback(async () => {
    setSelectedChannelId(channelId);

    if (
      channel?.type === ChannelType.VOICE &&
      currentVoiceChannelId !== channelId
    ) {
      const response = await joinVoice(channelId);

      if (!response) {
        // joining voice failed
        setSelectedChannelId(undefined);
        toast.error('Failed to join voice channel');

        return;
      }

      try {
        await init(response, channelId);
      } catch {
        setSelectedChannelId(undefined);
        toast.error('Failed to initialize voice connection');
      }
    }
  }, [channelId, channel?.type, init, currentVoiceChannelId]);

  if (!channel) {
    return null;
  }

  if (!channelCan(ChannelPermission.VIEW_CHANNEL)) return null;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform && { ...transform, x: 0 }),
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
                !channelCan(ChannelPermission.JOIN) ||
                !can(Permission.JOIN_VOICE_CHANNELS)
              }
            />
          )}
        </div>
      </ChannelContextMenu>
    </div>
  );
});

type TChannelsProps = {
  categoryId: number;
};

const Channels = memo(({ categoryId }: TChannelsProps) => {
  const channels = useChannelsByCategoryId(categoryId);
  const selectedChannelId = useSelectedChannelId();
  const channelIds = useMemo(() => channels.map((ch) => ch.id), [channels]);
  const can = useCan();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    })
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id) {
        return;
      }

      const oldIndex = channelIds.indexOf(active.id as number);
      const newIndex = channelIds.indexOf(over.id as number);

      if (oldIndex === -1 || newIndex === -1) {
        return;
      }

      const reorderedIds = [...channelIds];
      const [movedId] = reorderedIds.splice(oldIndex, 1);

      reorderedIds.splice(newIndex, 0, movedId);

      try {
        const trpc = getTRPCClient();

        await trpc.channels.reorder.mutate({
          categoryId,
          channelIds: reorderedIds
        });
      } catch (error) {
        toast.error(getTrpcError(error, 'Failed to reorder channels'));
      }
    },
    [categoryId, channelIds]
  );

  return (
    <div className="space-y-0.5">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={channelIds}
          strategy={verticalListSortingStrategy}
          disabled={!can(Permission.MANAGE_CHANNELS)}
        >
          {channels.map((channel) => (
            <Channel
              key={channel.id}
              channelId={channel.id}
              isSelected={selectedChannelId === channel.id}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
});

export { Channels };
