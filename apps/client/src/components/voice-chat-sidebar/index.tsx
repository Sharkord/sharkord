import { TextChannel } from '@/components/channel-view/text';
import {
  useCurrentVoiceChannelId,
  useIsCurrentVoiceChannelSelected
} from '@/features/server/channels/hooks';
import { getLocalStorageItem, LocalStorageKey } from '@/helpers/storage';
import { cn } from '@/lib/utils';
import { memo, useCallback, useEffect, useRef, useState } from 'react';

type TVoiceChatSidebarProps = {
  isOpen: boolean;
};

const MIN_WIDTH = 360;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 384; // w-96 = 384px

const VoiceChatSidebar = memo(({ isOpen }: TVoiceChatSidebarProps) => {
  const currentVoiceChannelId = useCurrentVoiceChannelId();
  const isCurrentVoiceChannelSelected = useIsCurrentVoiceChannelSelected();
  const [width, setWidth] = useState(() => {
    const savedWidth = getLocalStorageItem(
      LocalStorageKey.VOICE_CHAT_SIDEBAR_WIDTH
    );
    return savedWidth ? parseInt(savedWidth, 10) : DEFAULT_WIDTH;
  });
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!sidebarRef.current) return;

      const rect = sidebarRef.current.getBoundingClientRect();
      const newWidth = rect.right - e.clientX;

      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setWidth(newWidth);
        localStorage.setItem(
          LocalStorageKey.VOICE_CHAT_SIDEBAR_WIDTH,
          newWidth.toString()
        );
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  if (!currentVoiceChannelId || !isCurrentVoiceChannelSelected) {
    return null;
  }

  return (
    <div
      ref={sidebarRef}
      className={cn(
        'hidden lg:flex flex-col bg-card border-l border-border transition-all ease-in-out relative overflow-hidden',
        isOpen ? 'border-l-1' : 'w-0 border-l-0',
        !isResizing && 'duration-500'
      )}
      style={{
        width: isOpen ? `${width}px` : '0px'
      }}
    >
      {isOpen && (
        <>
          <div
            className={cn(
              'absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors z-50',
              isResizing && 'bg-primary'
            )}
            onMouseDown={handleMouseDown}
          />
          <div className="flex flex-col h-full w-full">
            <div className="flex-1 flex flex-col overflow-hidden">
              <TextChannel channelId={currentVoiceChannelId} />
            </div>
          </div>
        </>
      )}
    </div>
  );
});

export { VoiceChatSidebar };
