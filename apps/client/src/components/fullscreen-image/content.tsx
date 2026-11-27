import { cn } from '@/lib/utils';
import { IconButton } from '@sharkord/ui';
import { Link, X } from 'lucide-react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

const portalRoot = document.getElementById('imagePortal')!;

type TFullScreenImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  as?: React.ElementType;
};

const FullScreenImage = memo(
  ({ as: Component = 'img', ...props }: TFullScreenImageProps) => {
    const { t } = useTranslation('common');

    const [open, setOpen] = useState(false);
    const [visible, setVisible] = useState(false);

    const imgRef = useRef<HTMLImageElement>(null);
    const scaleRef = useRef(0.8);
    const posRef = useRef({ x: 0, y: 0 });
    const lastMouseRef = useRef({ x: 0, y: 0 });
    const draggingRef = useRef(false);
    const pointersRef = useRef(new Map<number, { x: number; y: number }>());
    const pinchDistanceRef = useRef(0);

    const applyTransform = useCallback(() => {
      const el = imgRef.current;

      if (!el) return;

      el.style.transform = `scale(${scaleRef.current}) translate(${posRef.current.x}px, ${posRef.current.y}px)`;
    }, []);

    const onOpenClick = useCallback(() => {
      scaleRef.current = 0.8;
      posRef.current = { x: 0, y: 0 };

      setOpen(true);

      setTimeout(() => setVisible(true), 10);
    }, []);

    const onCloseClick = useCallback(() => {
      setVisible(false);

      scaleRef.current = 1;
      posRef.current = { x: 0, y: 0 };

      setTimeout(() => setOpen(false), 300);
    }, []);

    const handlePointerDown = useCallback(
      (e: React.PointerEvent<HTMLImageElement>) => {
        if (e.button !== 0) return;

        pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        draggingRef.current = true;
        lastMouseRef.current = { x: e.clientX, y: e.clientY };

        const el = imgRef.current;

        if (el) {
          el.style.cursor = 'grabbing';
        }
      },
      []
    );

    useEffect(() => {
      if (!open) return;

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onCloseClick();
        }
      };

      const handleWheel = (e: WheelEvent) => {
        e.preventDefault();

        const prev = scaleRef.current;

        scaleRef.current = Math.min(Math.max(prev - e.deltaY * 0.001, 0.5), 3);

        applyTransform();
      };

      const handlePointerMove = (e: PointerEvent) => {
        const pointers = pointersRef.current;

        if (!draggingRef.current || !pointers.has(e.pointerId)) return;

        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

        // two fingers on a touch screen stand in for the wheel zoom
        if (pointers.size === 2) {
          const [a, b] = [...pointers.values()];
          const distance = Math.hypot(a.x - b.x, a.y - b.y);

          if (pinchDistanceRef.current) {
            const next =
              scaleRef.current * (distance / pinchDistanceRef.current);

            scaleRef.current = Math.min(Math.max(next, 0.5), 3);

            applyTransform();
          }

          pinchDistanceRef.current = distance;

          return;
        }

        const dx = e.clientX - lastMouseRef.current.x;
        const dy = e.clientY - lastMouseRef.current.y;

        lastMouseRef.current = { x: e.clientX, y: e.clientY };

        posRef.current = {
          x: posRef.current.x + dx,
          y: posRef.current.y + dy
        };

        applyTransform();
      };

      const handlePointerUp = (e: PointerEvent) => {
        pointersRef.current.delete(e.pointerId);
        pinchDistanceRef.current = 0;

        if (pointersRef.current.size > 0) {
          const [remaining] = [...pointersRef.current.values()];

          lastMouseRef.current = remaining;

          return;
        }

        draggingRef.current = false;

        const el = imgRef.current;

        if (el) {
          el.style.cursor = 'grab';
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('wheel', handleWheel, { passive: false });
      document.addEventListener('pointermove', handlePointerMove);
      document.addEventListener('pointerup', handlePointerUp);
      document.addEventListener('pointercancel', handlePointerUp);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('wheel', handleWheel);
        document.removeEventListener('pointermove', handlePointerMove);
        document.removeEventListener('pointerup', handlePointerUp);
        document.removeEventListener('pointercancel', handlePointerUp);
      };
    }, [open, onCloseClick, applyTransform]);

    const onClickOutside = useCallback(() => {
      if (!draggingRef.current) {
        onCloseClick();
      }
    }, [onCloseClick]);

    const onCopyLink = useCallback(
      async (e: React.MouseEvent) => {
        e.stopPropagation();

        if (!props.src) return;

        try {
          navigator.clipboard.writeText(props.src);

          toast.success(t('common:imageLinkCopied'));
        } catch {
          toast.error(t('common:failedCopyImageLink'));
        }
      },
      [props.src, t]
    );

    const portalContainer = open
      ? createPortal(
          <>
            <div
              className={cn(
                'fixed inset-0 flex justify-center items-center backdrop-blur-sm bg-black/30 z-50 transition-opacity duration-300',
                visible ? 'opacity-100' : 'opacity-0',
                open ? 'pointer-events-auto' : 'pointer-events-none'
              )}
              onClick={onClickOutside}
            >
              <Component
                {...props}
                ref={imgRef}
                style={{
                  transform: `scale(${scaleRef.current}) translate(${posRef.current.x}px, ${posRef.current.y}px)`,
                  cursor: 'grab'
                }}
                className="p-4 max-w-full max-h-full object-contain touch-none"
                onPointerDown={handlePointerDown}
                draggable={false}
                onClick={(e: React.MouseEvent<HTMLDivElement>) =>
                  e.stopPropagation()
                }
              />
              <div className="flex gap-2 absolute top-2 right-2 z-50 pointer-coarse:top-4 pointer-coarse:right-4 pointer-coarse:gap-5">
                <IconButton icon={Link} variant="ghost" onClick={onCopyLink} />
                <IconButton onClick={onCloseClick} icon={X} variant="ghost" />
              </div>
            </div>
          </>,
          portalRoot
        )
      : null;

    return (
      <>
        <Component
          loading="lazy"
          decoding="async"
          {...props}
          className={cn('cursor-pointer', props.className)}
          onClick={onOpenClick}
          draggable={false}
        />
        {portalContainer}
      </>
    );
  }
);

export { FullScreenImage };
