import { getLocalStorageItem, type LocalStorageKey } from '@/helpers/storage';
import { useCallback, useEffect, useRef, useState } from 'react';

type TResizableSidebarOptions = {
  storageKey: LocalStorageKey;
  minWidth: number;
  maxWidth: number;
  defaultWidth: number;
  edge: 'left' | 'right';
};

const useResizableSidebar = ({
  storageKey,
  minWidth,
  maxWidth,
  defaultWidth,
  edge
}: TResizableSidebarOptions) => {
  const [width, setWidth] = useState(() => {
    const saved = getLocalStorageItem(storageKey);

    return saved ? parseInt(saved, 10) : defaultWidth;
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

      const newWidth =
        edge === 'left'
          ? rect.right - e.clientX // right-side panel: drag left edge
          : e.clientX - rect.left; // left-side panel: drag right edge

      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setWidth(newWidth);

        localStorage.setItem(storageKey, newWidth.toString());
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
  }, [isResizing, edge, minWidth, maxWidth, storageKey]);

  return {
    width,
    isResizing,
    sidebarRef,
    handleMouseDown
  };
};

export { useResizableSidebar };
