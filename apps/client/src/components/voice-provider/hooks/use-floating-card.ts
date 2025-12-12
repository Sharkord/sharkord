import {
  getLocalStorageItemAsJSON,
  LocalStorageKey,
  setLocalStorageItemAsJSON
} from '@/helpers/storage';
import { useCallback, useEffect, useRef, useState } from 'react';

type TPosition = {
  x: number;
  y: number;
};

export const useFloatingCard = () => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<TPosition | undefined>(
    getLocalStorageItemAsJSON<TPosition>(LocalStorageKey.FLOATING_CARD_POSITION)
  );
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (position) {
      setLocalStorageItemAsJSON<TPosition>(
        LocalStorageKey.FLOATING_CARD_POSITION,
        position
      );
    }
  }, [position]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !cardRef.current) return;

      const parent = cardRef.current.parentElement;
      if (!parent) return;

      const parentRect = parent.getBoundingClientRect();
      const cardRect = cardRef.current.getBoundingClientRect();

      let newX = e.clientX - parentRect.left - dragOffset.x;
      let newY = e.clientY - parentRect.top - dragOffset.y;

      newX = Math.max(0, Math.min(newX, parentRect.width - cardRect.width));
      newY = Math.max(0, Math.min(newY, parentRect.height - cardRect.height));

      setPosition({ x: newX, y: newY });
    },
    [isDragging, dragOffset]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const getStyle = useCallback(() => {
    return {
      right: position ? undefined : '1rem',
      bottom: position ? undefined : '1rem',
      left: position ? `${position.x}px` : undefined,
      top: position ? `${position.y}px` : undefined
    };
  }, [position]);

  const resetCard = useCallback(() => {
    setPosition(undefined);
  }, []);

  return {
    cardRef,
    handleMouseDown,
    getStyle,
    resetCard
  };
};
