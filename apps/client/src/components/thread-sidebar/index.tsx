import { ResizableSidebar } from '@/components/resizable-sidebar';
import { useThreadSidebar } from '@/features/app/hooks';
import { LocalStorageKey } from '@/helpers/storage';
import { memo } from 'react';
import { ThreadContent } from './tread-content';

const MIN_WIDTH = 360;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 384;

const ThreadContentWrapper = memo(() => {
  const { parentMessageId, channelId } = useThreadSidebar();

  if (!parentMessageId || !channelId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="text-muted-foreground">No thread selected</span>
      </div>
    );
  }

  return (
    <ThreadContent parentMessageId={parentMessageId} channelId={channelId} />
  );
});

type TThreadSidebarProps = {
  isOpen: boolean;
};

const ThreadSidebar = memo(({ isOpen }: TThreadSidebarProps) => {
  return (
    <ResizableSidebar
      storageKey={LocalStorageKey.THREAD_SIDEBAR_WIDTH}
      minWidth={MIN_WIDTH}
      maxWidth={MAX_WIDTH}
      defaultWidth={DEFAULT_WIDTH}
      edge="left"
      isOpen={isOpen}
      className="hidden lg:flex"
    >
      <ThreadContentWrapper />
    </ResizableSidebar>
  );
});

export { ThreadSidebar };
