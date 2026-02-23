import { cn } from '@/lib/utils';
import { Button } from '@sharkord/ui';
import { X } from 'lucide-react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const portalRoot = document.getElementById('imagePortal')!;

type TFullScreenImageProps = React.ImgHTMLAttributes<HTMLImageElement>;

const FullScreenImage = memo((props: TFullScreenImageProps) => {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [scale, setScale] = useState(0.8);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const lastPosition = useRef({ x: 0, y: 0 });
  const animationFrameId = useRef<number | null>(null);

  const onOpenClick = useCallback(() => {
    setOpen(true);
    setTimeout(() => setVisible(true), 10);
  }, []);

  const onCloseClick = useCallback(() => {
    setVisible(false);
    setTimeout(() => setOpen(false), 300);
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleScroll = useCallback((e: WheelEvent) => {
    e.preventDefault();
    setScale((prevScale) => {
      const newScale = prevScale - e.deltaY * 0.001;
      return Math.min(Math.max(newScale, 0.5), 3);
    });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    lastPosition.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = e.clientX - lastPosition.current.x;
      const deltaY = e.clientY - lastPosition.current.y;

      lastPosition.current = { x: e.clientX, y: e.clientY };

      setPosition((prevPosition) => ({
        x: prevPosition.x + deltaX,
        y: prevPosition.y + deltaY
      }));
    },
    [isDragging]
  );

  const onClickOutside = useCallback(() => {
    if (!isDragging) onCloseClick();
  }, [isDragging, onCloseClick]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    if (animationFrameId.current !== null) {
      cancelAnimationFrame(animationFrameId.current);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseClick();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('wheel', handleScroll, { passive: false });
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('wheel', handleScroll);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onCloseClick, open, handleScroll, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    if (isDragging) {
      const animate = () => {
        setPosition((prevPosition) => ({
          x: prevPosition.x,
          y: prevPosition.y
        }));

        animationFrameId.current = requestAnimationFrame(animate);
      };

      animationFrameId.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [isDragging]);

  const portalContainer = createPortal(
    <>
      <div
        className={cn(
          'fixed inset-0 flex justify-center items-center backdrop-blur-sm bg-black/30 z-50 transition-opacity duration-300',
          visible ? 'opacity-100' : 'opacity-0',
          open ? 'pointer-events-auto' : 'pointer-events-none'
        )}
        onClick={onClickOutside}
      >
        <img
          {...props}
          style={{
            transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)`,
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
          className="p-4 max-w-full max-h-full object-contain transition-transform duration-100"
          onMouseDown={handleMouseDown}
          draggable={false}
          onClick={(e) => e.stopPropagation()}
        />
        <Button
          onClick={onCloseClick}
          size="icon"
          variant="outline"
          className="absolute top-2 right-2 z-50"
        >
          <X size="1.1rem" />
        </Button>
      </div>
    </>,
    portalRoot
  );

  return (
    <>
      <img
        {...props}
        className={cn('cursor-pointer', props.className)}
        onClick={onOpenClick}
        draggable={false}
      />
      {portalContainer}
    </>
  );
});

export { FullScreenImage };
