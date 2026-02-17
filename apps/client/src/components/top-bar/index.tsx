import { Button } from '@/components/ui/button';
import {
  useCurrentVoiceChannelId,
  useIsCurrentVoiceChannelSelected
} from '@/features/server/channels/hooks';
import { cn } from '@/lib/utils';
import { PluginSlot } from '@sharkord/shared';
import { MessageSquare, PanelRight, PanelRightClose } from 'lucide-react';
import { memo } from 'react';
import { PluginSlotRenderer } from '../plugin-slot-renderer';
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
    const isCurrentVoiceChannelSelected = useIsCurrentVoiceChannelSelected();
    const currentVoiceChannelId = useCurrentVoiceChannelId();

    return (
      <div className="hidden lg:flex h-8 w-full bg-card border-b border-border items-center justify-end px-4 transition-all duration-300 ease-in-out gap-2">
        <PluginSlotRenderer slotId={PluginSlot.TOPBAR_RIGHT} />
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
                  isVoiceChatOpen ? 'Close Voice Chat' : 'Open Voice Chat'
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
            <Tooltip content="Close Members Sidebar">
              <div>
                <PanelRightClose className="w-4 h-4 transition-transform duration-200 ease-in-out" />
              </div>
            </Tooltip>
          ) : (
            <Tooltip content="Open Members Sidebar">
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
