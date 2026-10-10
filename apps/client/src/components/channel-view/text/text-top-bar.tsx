import { PluginSlotRenderer } from '@/components/plugin-slot-renderer';
import { toggleChannelMuted } from '@/features/app/actions';
import { useIsChannelMuted } from '@/features/app/hooks';
import { useChannelById } from '@/features/server/channels/hooks';
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

    const onUnmuteClick = useCallback(() => {
      toggleChannelMuted(channelId);
    }, [channelId]);

    const pluginProps = useMemo(() => ({ channelId }), [channelId]);

    const info = useMemo(() => {
      if (channel?.isDm) {
        return {
          name: 'Direct Message',
          topic:
            'This is a direct message channel for conversations between you and the recipient.'
        };
      }

      return {
        name: channel?.name,
        topic: channel?.topic
      };
    }, [channel]);

    const getIcon = useCallback(() => {
      if (channel?.isDm) {
        return (
          <MessageCircleMore className="inline-block text-muted-foreground h-4 w-4" />
        );
      }

      if (channel?.type === ChannelType.TEXT) {
        return <Hash className="inline-block text-muted-foreground h-4 w-4" />;
      }

      if (channel?.type === ChannelType.VOICE) {
        return (
          <Volume2 className="inline-block text-muted-foreground h-4 w-4" />
        );
      }

      return null;
    }, [channel]);

    return (
      <div className="flex h-12 border-b border-border bg-card w-auto overflow-hidden">
        <div className="flex w-full items-center justify-between px-4">
          <div className="flex items-center gap-2 min-w-0">
            {getIcon()}
            <span className="font-bold truncate max-w-40">{info.name}</span>
            {info.topic && (
              <span className="text-xs text-muted-foreground truncate">
                {info.topic}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
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
              <IconButton
                onClick={onClose}
                icon={X}
                variant="ghost"
                size="sm"
              />
            )}
          </div>
        </div>
      </div>
    );
  }
);

export { TextTopbar };
