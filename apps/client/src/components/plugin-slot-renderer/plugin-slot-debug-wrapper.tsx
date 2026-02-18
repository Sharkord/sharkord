import { memo, useLayoutEffect, useRef, useState } from 'react';

type TPlugSlotDebugWrapperProps = {
  children: React.ReactNode;
  pluginId: string;
  slotId: string;
};

const rectsEqual = (a: DOMRect | null, b: DOMRect) =>
  a !== null &&
  a.top === b.top &&
  a.left === b.left &&
  a.width === b.width &&
  a.height === b.height;

const PlugSlotDebugWrapper = memo(
  ({ children, pluginId, slotId }: TPlugSlotDebugWrapperProps) => {
    const markerRef = useRef<HTMLDivElement>(null);
    const [rect, setRect] = useState<DOMRect | null>(null);

    useLayoutEffect(() => {
      const marker = markerRef.current;

      if (!marker) return;

      let rafId: number;
      let prevRect: DOMRect | null = null;

      const update = () => {
        const target = marker.nextElementSibling as HTMLElement | null;

        if (!target) {
          prevRect = null;
          setRect(null);
          rafId = requestAnimationFrame(update);
          return;
        }

        const newRect = target.getBoundingClientRect();

        if (!rectsEqual(prevRect, newRect)) {
          prevRect = newRect;
          setRect(newRect);
        }

        rafId = requestAnimationFrame(update);
      };

      rafId = requestAnimationFrame(update);

      return () => cancelAnimationFrame(rafId);
    }, []);

    return (
      <>
        <div ref={markerRef} style={{ display: 'none' }} />
        {children}
        {rect && (
          <div
            className="pointer-events-none fixed z-1"
            style={{
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height
            }}
          >
            <div className="absolute inset-0 border border-dashed border-red-500" />
            <span className="absolute top-1 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[9px] px-1 rounded whitespace-nowrap">
              {pluginId} - {slotId}
            </span>
          </div>
        )}
      </>
    );
  }
);

export { PlugSlotDebugWrapper };
