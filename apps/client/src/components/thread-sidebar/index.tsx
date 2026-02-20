import { useThreadSidebar } from '@/features/app/hooks';
import { LocalStorageKey } from '@/helpers/storage';
import { useResizableSidebar } from '@/hooks/use-resizable-sidebar';
import { cn } from '@/lib/utils';
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
  const { width, isResizing, sidebarRef, handleMouseDown } =
    useResizableSidebar({
      storageKey: LocalStorageKey.THREAD_SIDEBAR_WIDTH,
      minWidth: MIN_WIDTH,
      maxWidth: MAX_WIDTH,
      defaultWidth: DEFAULT_WIDTH,
      edge: 'left'
    });

  return (
    <div
      ref={sidebarRef}
      className={cn(
        'hidden lg:flex flex-col bg-card border-l border-border transition-all ease-in-out relative overflow-hidden',
        isOpen ? 'border-l' : 'w-0 border-l-0',
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
          <ThreadContentWrapper />
        </>
      )}
    </div>
  );
});

export { ThreadSidebar };
