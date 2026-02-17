import { memo, useLayoutEffect, useRef, useState } from 'react';

type TPlugSlotDebugWrapperProps = {
  children: React.ReactNode;
  pluginId: string;
  slotId: string;
};

const PlugSlotDebugWrapper = memo(
  ({ children, pluginId, slotId }: TPlugSlotDebugWrapperProps) => {
    const markerRef = useRef<HTMLDivElement>(null);
    const [rect, setRect] = useState<DOMRect | null>(null);

    useLayoutEffect(() => {
      const marker = markerRef.current;

      if (!marker) return;

      const target = marker.nextElementSibling as HTMLElement | null;

      if (!target) return;

      const update = () => setRect(target.getBoundingClientRect());

      update();

      const observer = new ResizeObserver(update);

      observer.observe(target);

      return () => observer.disconnect();
    }, []);

    return (
      <>
        <div ref={markerRef} style={{ display: 'none' }} />

        {children}

        {rect && (
          <div
            className="pointer-events-none fixed z-9999"
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
