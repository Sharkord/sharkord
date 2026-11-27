import { ContentHeader } from '@/components/content-header';
import { PluginSlotRenderer } from '@/components/plugin-slot-renderer';
import { toggleChannelMuted } from '@/features/app/actions';
import { useIsChannelMuted } from '@/features/app/hooks';
import { useChannelById } from '@/features/server/channels/hooks';
import { useDirectMessageByChannelId } from '@/features/server/dms/hooks';
import { useUserById } from '@/features/server/users/hooks';
import { ChannelType, PluginSlot } from '@sharkord/shared';
import { IconButton, Tooltip } from '@sharkord/ui';
import { BellOff, Hash, MessageCircleMore, Volume2, X } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PinnedMessagesPopover } from './pinned-messages-popover';

type TTextTopbarProps = {
  onScrollToMessage: (messageId: number) => Promise<void>;
  channelId: number;
  onClose?: () => void;
};

const TextTopbar = memo(
  ({ onScrollToMessage, channelId, onClose }: TTextTopbarProps) => {
    const { t } = useTranslation();
    const channel = useChannelById(channelId);
    const isMuted = useIsChannelMuted(channelId);
    const directMessage = useDirectMessageByChannelId(channelId);
    const dmUser = useUserById(directMessage?.userId ?? null);

    const onUnmuteClick = useCallback(() => {
      toggleChannelMuted(channelId);
    }, [channelId]);

    const pluginProps = useMemo(() => ({ channelId }), [channelId]);

    let Icon = Hash;
    let name = channel?.name;
    let topic = channel?.topic;

    if (channel?.isDm) {
      Icon = MessageCircleMore;
      name = dmUser?.name ?? t('directMessage');
      topic = null;
    } else if (channel?.type === ChannelType.VOICE) {
      Icon = Volume2;
    }

    const actions = (
      <>
        <PluginSlotRenderer
          slotId={PluginSlot.CHANNEL_HEADER}
          props={pluginProps}
        />
        {isMuted && (
          <Tooltip content={t('channelMutedTooltip')}>
            <IconButton
              icon={BellOff}
              size="sm"
              variant="ghost"
              onClick={onUnmuteClick}
            />
          </Tooltip>
        )}
        <PinnedMessagesPopover onScrollToMessage={onScrollToMessage} />
        {onClose && (
          <IconButton onClick={onClose} icon={X} variant="ghost" size="sm" />
        )}
      </>
    );

    return (
      <ContentHeader actions={actions}>
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 truncate font-bold md:max-w-40 md:shrink-0">
          {name}
        </span>
        {topic && (
          <span className="truncate text-xs text-muted-foreground max-md:hidden">
            {topic}
          </span>
        )}
      </ContentHeader>
    );
  }
);

export { TextTopbar };
