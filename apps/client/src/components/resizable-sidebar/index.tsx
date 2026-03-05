import type { LocalStorageKey } from '@/helpers/storage';
import { useResizableSidebar } from '@/hooks/use-resizable-sidebar';
import { cn } from '@/lib/utils';
import { memo, type ReactNode } from 'react';

type TResizableSidebarProps = {
  storageKey: LocalStorageKey;
  minWidth: number;
  maxWidth: number;
  defaultWidth: number;
  edge: 'left' | 'right';
  isOpen?: boolean;
  className?: string;
  children: ReactNode;
};

const ResizableSidebar = memo(
  ({
    storageKey,
    minWidth,
    maxWidth,
    defaultWidth,
    edge,
    isOpen = true,
    className,
    children
  }: TResizableSidebarProps) => {
    const { width, isResizing, sidebarRef, handleMouseDown } =
      useResizableSidebar({
        storageKey,
        minWidth,
        maxWidth,
        defaultWidth,
        edge
      });

    const isLeftEdge = edge === 'left';

    return (
      <div
        ref={sidebarRef}
        className={cn(
          'flex flex-col bg-card border-border relative',
          isLeftEdge ? 'border-l' : 'border-r',
          !isOpen && 'w-0 border-0! overflow-hidden',
          !isResizing && 'transition-all duration-500 ease-in-out',
          className
        )}
        style={{
          width: isOpen ? `${width}px` : '0px'
        }}
      >
        {isOpen && (
          <>
            <div
              className={cn(
                'absolute top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors z-50',
                isLeftEdge ? 'left-0' : 'right-0',
                isResizing && 'bg-primary'
              )}
              onMouseDown={handleMouseDown}
            />
            {children}
          </>
        )}
      </div>
    );
  }
);

export { ResizableSidebar };
