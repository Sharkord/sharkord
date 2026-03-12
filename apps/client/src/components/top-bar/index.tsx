import {
  useCurrentVoiceChannelId,
  useIsCurrentVoiceChannelSelected
} from '@/features/server/channels/hooks';
import { usePublicServerSettings } from '@/features/server/hooks';
import { cn } from '@/lib/utils';
import { PluginSlot } from '@sharkord/shared';
import { Button, Tooltip } from '@sharkord/ui';
import { MessageSquare, PanelRight, PanelRightClose } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { PluginSlotRenderer } from '../plugin-slot-renderer';
import { ServerSearch } from './server-search';
import { VoiceOptionsController } from './voice-options-controller';
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
    const { t } = useTranslation('topbar');
    const isCurrentVoiceChannelSelected = useIsCurrentVoiceChannelSelected();
    const currentVoiceChannelId = useCurrentVoiceChannelId();
    const settings = usePublicServerSettings();

    return (
      <div className="hidden lg:grid h-12 w-full grid-cols-[1fr_minmax(320px,1.4fr)_1fr] items-center border-b border-border bg-card px-4 transition-all duration-300 ease-in-out gap-2">
        <div className="flex min-w-0 items-center gap-2" />

        <div className="flex items-center justify-center">
          {settings?.enableSearch && <ServerSearch />}
        </div>

        <div className="flex min-w-0 items-center justify-end gap-2">
          <PluginSlotRenderer slotId={PluginSlot.TOPBAR_RIGHT} />
          {isCurrentVoiceChannelSelected && currentVoiceChannelId && (
            <>
              <VoiceOptionsController />
              <VolumeController channelId={currentVoiceChannelId} />
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleVoiceChat}
                className="h-7 px-2 transition-all duration-200 ease-in-out"
              >
                <Tooltip
                  content={
                    isVoiceChatOpen ? t('closeVoiceChat') : t('openVoiceChat')
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
            className="h-7 px-2 transition-all duration-200 ease-in-out"
          >
            {isOpen ? (
              <Tooltip content={t('closeMembersSidebar')}>
                <div>
                  <PanelRightClose className="w-4 h-4 transition-transform duration-200 ease-in-out" />
                </div>
              </Tooltip>
            ) : (
              <Tooltip content={t('openMembersSidebar')}>
                <div>
                  <PanelRight className="w-4 h-4 transition-transform duration-200 ease-in-out" />
                </div>
              </Tooltip>
            )}
          </Button>
        </div>
      </div>
    );
  }
);

export { TopBar };
