import { TextChannel } from '@/components/channel-view/text';
import { ResizableSidebar } from '@/components/resizable-sidebar';
import {
  useCurrentVoiceChannelId,
  useIsCurrentVoiceChannelSelected
} from '@/features/server/channels/hooks';
import { LocalStorageKey } from '@/helpers/storage';
import { memo } from 'react';

type TVoiceChatSidebarProps = {
  isOpen: boolean;
};

const MIN_WIDTH = 360;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 384;

const VoiceChatSidebar = memo(({ isOpen }: TVoiceChatSidebarProps) => {
  const currentVoiceChannelId = useCurrentVoiceChannelId();
  const isCurrentVoiceChannelSelected = useIsCurrentVoiceChannelSelected();

  if (!currentVoiceChannelId || !isCurrentVoiceChannelSelected) {
    return null;
  }

  return (
    <ResizableSidebar
      storageKey={LocalStorageKey.VOICE_CHAT_SIDEBAR_WIDTH}
      minWidth={MIN_WIDTH}
      maxWidth={MAX_WIDTH}
      defaultWidth={DEFAULT_WIDTH}
      edge="left"
      isOpen={isOpen}
      className="hidden lg:flex"
    >
      <div className="flex flex-col h-full w-full">
        <div className="flex-1 flex flex-col overflow-hidden">
          <TextChannel channelId={currentVoiceChannelId} />
        </div>
      </div>
    </ResizableSidebar>
  );
});

export { VoiceChatSidebar };
