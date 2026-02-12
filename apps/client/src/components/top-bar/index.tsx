import { Button } from '@/components/ui/button';
import {
  useCurrentVoiceChannelId,
  useIsCurrentVoiceChannelSelected
} from '@/features/server/channels/hooks';
import { cn } from '@/lib/utils';
import { MessageSquare, PanelRight, PanelRightClose } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Tooltip } from '../ui/tooltip';
import { VolumeController } from './volume-controller';

type TTopBarProps = {
  onToggleRightSidebar: () => void;
  isOpen: boolean;
  onToggleVoiceChat: () => void;
  isVoiceChatOpen: boolean;
};

const TopBar = memo(
  ({
    onToggleRightSidebar,
    isOpen,
    onToggleVoiceChat,
    isVoiceChatOpen
  }: TTopBarProps) => {
    const { t } = useTranslation();
    const isCurrentVoiceChannelSelected = useIsCurrentVoiceChannelSelected();
    const currentVoiceChannelId = useCurrentVoiceChannelId();

    return (
      <div className="hidden lg:flex h-8 w-full bg-card border-b border-border items-center justify-end px-4 transition-all duration-300 ease-in-out gap-2">
        {isCurrentVoiceChannelSelected && currentVoiceChannelId && (
          <>
            <VolumeController channelId={currentVoiceChannelId} />
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleVoiceChat}
              className="h-6 px-2 transition-all duration-200 ease-in-out"
            >
              <Tooltip
                content={
                  isVoiceChatOpen
                    ? t('topBar.closeVoiceChat')
                    : t('topBar.openVoiceChat')
                }
                asChild={false}
              >
                <MessageSquare
                  className={cn(
                    'w-4 h-4 transition-all duration-200 ease-in-out',
                    isVoiceChatOpen && 'fill-current'
                  )}
                />
              </Tooltip>
            </Button>
          </>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleRightSidebar}
          className="h-6 px-2 transition-all duration-200 ease-in-out"
        >
          {isOpen ? (
            <Tooltip content={t('topBar.closeMembersSidebar')}>
              <div>
                <PanelRightClose className="w-4 h-4 transition-transform duration-200 ease-in-out" />
              </div>
            </Tooltip>
          ) : (
            <Tooltip content={t('topBar.openMembersSidebar')}>
              <div>
                <PanelRight className="w-4 h-4 transition-transform duration-200 ease-in-out" />
              </div>
            </Tooltip>
          )}
        </Button>
      </div>
    );
  }
);

export { TopBar };
