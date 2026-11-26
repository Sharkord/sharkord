import { toggleVoiceChatSidebar } from '@/features/app/actions';
import { useVoiceChatSidebar } from '@/features/app/hooks';
import {
  useHasUnreadMentions,
  useUnreadMessagesCount
} from '@/features/server/hooks';
import { cn } from '@/lib/utils';
import { IconButton, Tooltip, UnreadCount } from '@sharkord/ui';
import { MessageSquare } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { VoiceOptionsController } from './voice-options-controller';
import { VolumeController } from './volume-controller';

type TVoiceButtonsProps = {
  currentVoiceChannelId: number;
};

const VoiceButtons = memo(({ currentVoiceChannelId }: TVoiceButtonsProps) => {
  const { t } = useTranslation('topbar');
  const { isOpen: isAnyVoiceChatOpen, channelId: openVoiceChatChannelId } =
    useVoiceChatSidebar();

  const isVoiceChatOpen =
    isAnyVoiceChatOpen && openVoiceChatChannelId === currentVoiceChannelId;

  const currentVoiceChannelUnreadCount = useUnreadMessagesCount(
    currentVoiceChannelId
  );
  const currentVoiceChannelHasUnreadMentions = useHasUnreadMentions(
    currentVoiceChannelId
  );

  const voiceChatLabel = isVoiceChatOpen
    ? t('closeVoiceChat')
    : t('openVoiceChat');

  const handleToggleVoiceChat = useCallback(() => {
    if (currentVoiceChannelId) {
      toggleVoiceChatSidebar(currentVoiceChannelId);
    }
  }, [currentVoiceChannelId]);

  return (
    <>
      <VoiceOptionsController />
      <VolumeController channelId={currentVoiceChannelId} />
      <Tooltip content={voiceChatLabel}>
        <div className="relative flex">
          <IconButton
            icon={MessageSquare}
            variant="ghost"
            size="sm"
            onClick={handleToggleVoiceChat}
            aria-label={voiceChatLabel}
            className={cn(isVoiceChatOpen && '[&_svg]:fill-current')}
          />
          <UnreadCount
            count={currentVoiceChannelUnreadCount}
            hasMention={currentVoiceChannelHasUnreadMentions}
            className="pointer-events-none absolute -top-2 -right-3 ml-0 min-w-4 h-4 px-1 text-[10px] leading-none"
          />
        </div>
      </Tooltip>
    </>
  );
});

export { VoiceButtons };
