import { cn } from '@/lib/utils';
import {
  isValidElement,
  memo,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';

type TVoiceGridProps = {
  children: ReactNode[];
  pinnedCardId?: string;
  className?: string;
};

const OPTIMAL_CELL_ASPECT_RATIO = 1.5;

const VoiceGrid = memo(
  ({ children, pinnedCardId, className }: TVoiceGridProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerSize, setContainerSize] = useState<{
      width: number;
      height: number;
    } | null>(null);

    useLayoutEffect(() => {
      const element = containerRef.current;
      if (!element) return;

      const updateSize = () => {
        const rect = element.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      };

      updateSize();

      const resizeObserver = new ResizeObserver(updateSize);
      resizeObserver.observe(element);

      return () => resizeObserver.disconnect();
    }, []);

    const calculateOptimalGrid = (
      totalCards: number,
      containerWidth: number,
      containerHeight: number
    ) => {
      if (totalCards <= 1 || containerWidth <= 0 || containerHeight <= 0) {
        return { cols: 1 };
      }

      const maxCols = totalCards;

      let bestCols = 1;
      let bestScore = Infinity;

      for (let cols = 1; cols <= maxCols; cols++) {
        const rows = Math.ceil(totalCards / cols);
        const cellWidth = containerWidth / cols;
        const cellHeight = containerHeight / rows;
        const cellAspectRatio = cellWidth / cellHeight;

        const score = Math.abs(cellAspectRatio - OPTIMAL_CELL_ASPECT_RATIO);
        if (score < bestScore) {
          bestScore = score;
          bestCols = cols;
        }
      }

      return { cols: bestCols };
    };

    const gridCols = useMemo(() => {
      const childArray = Array.isArray(children) ? children : [children];
      const totalCards = childArray.length;

      if (!containerSize) {
        return 1;
      }

      const { cols } = calculateOptimalGrid(
        totalCards,
        containerSize.width,
        containerSize.height
      );

      return cols;
    }, [children, containerSize]);

    const { pinnedCard, regularCards } = useMemo(() => {
      const childArray = Array.isArray(children) ? children : [children];

      if (pinnedCardId) {
        const pinned = childArray.find(
          (child: ReactNode) =>
            isValidElement(child) && child.key === pinnedCardId
        );

        const regular = childArray.filter(
          (child: ReactNode) =>
            !isValidElement(child) || child.key !== pinnedCardId
        );

        return { pinnedCard: pinned, regularCards: regular };
      }

      return { pinnedCard: null, regularCards: childArray };
    }, [children, pinnedCardId]);

    if (pinnedCardId && pinnedCard) {
      return (
        <div className={cn('flex flex-col h-full', className)}>
          <div className="flex-1 p-2 min-h-0">{pinnedCard}</div>

          {regularCards.length > 0 && (
            <div className="flex-shrink-0 border-t border-border bg-card/50">
              <div className="flex justify-center-safe gap-2 p-2 overflow-x-auto">
                {regularCards.map((card, index) => (
                  <div key={index} className="flex-shrink-0 w-40 h-24">
                    {card}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    const rows = Math.ceil(regularCards.length / gridCols);
    const lastRowCount = regularCards.length % gridCols || gridCols;
    const lastRowOffset =
      lastRowCount < gridCols ? ((gridCols - lastRowCount) / 2) * 100 : 0;
    const lastRowStart = regularCards.length - lastRowCount;

    return (
      <div
        ref={containerRef}
        className={cn('grid h-full w-full gap-2 p-2', className)}
        style={{
          gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`
        }}
      >
        {regularCards.map((card, index) => (
          <div
            key={isValidElement(card) ? card.key : index}
            style={
              lastRowOffset && index >= lastRowStart
                ? { transform: `translateX(${lastRowOffset}%)` }
                : undefined
            }
          >
            {card}
          </div>
        ))}
      </div>
    );
  }
);

export { VoiceGrid };
