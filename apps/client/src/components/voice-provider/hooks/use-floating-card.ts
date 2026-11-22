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

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  }, []);

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
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

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('pointermove', handlePointerMove);
      document.addEventListener('pointerup', handlePointerUp);
      return () => {
        document.removeEventListener('pointermove', handlePointerMove);
        document.removeEventListener('pointerup', handlePointerUp);
      };
    }
  }, [isDragging, handlePointerMove, handlePointerUp]);

  const getStyle = useCallback(() => {
    if (!position) return undefined;

    return { left: `${position.x}px`, top: `${position.y}px` };
  }, [position]);

  const resetCard = useCallback(() => {
    setPosition(undefined);
  }, []);

  return {
    cardRef,
    handlePointerDown,
    getStyle,
    resetCard,
    hasPosition: !!position
  };
};
