import { TextChannel } from '@/components/channel-view/text';
import { ResizableSidebar } from '@/components/resizable-sidebar';
import { closeVoiceChatSidebar } from '@/features/app/actions';
import { useVoiceChatSidebar } from '@/features/app/hooks';
import { LocalStorageKey } from '@/helpers/storage';
import { memo } from 'react';

const MIN_WIDTH = 360;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 384;

const VoiceChatSidebar = memo(() => {
  const { isOpen, channelId } = useVoiceChatSidebar();

  if (!channelId) {
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
          <TextChannel channelId={channelId} onClose={closeVoiceChatSidebar} />
        </div>
      </div>
    </ResizableSidebar>
  );
});

export { VoiceChatSidebar };
