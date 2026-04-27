import { cn } from '@/lib/utils';
import { Tooltip } from '@sharkord/ui';
import { ChevronDown, Users } from 'lucide-react';
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
    const [hideParticipents, setHideParticipents] = useState<boolean>(false);

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
          <div className="flex-1 p-3 min-h-0 relative">
            {pinnedCard}
            <div className="flex w-full justify-center absolute bottom-0 left-0 right-0 mb-5 pointer-events-none">
              <Tooltip content="Show/hide Participants" usePortal={false}>
                <button
                  className={cn(
                    'inline-flex items-center justify-center rounded px-3 py-2 gap-1',
                    'pointer-events-auto shadow-xl transition-all',
                    'bg-black/70 hover:bg-black/80',
                    'hidden group-hover/voice-stage:inline-flex'
                  )}
                  onClick={() => {
                    setHideParticipents(!hideParticipents);
                  }}
                  aria-label="Show/hide Participants"
                >
                  <Users className="size-3" />
                  <ChevronDown
                    className={cn(
                      'size-3 transition-transform duration-300 ease-in-out -mr-0.5',
                      hideParticipents && 'rotate-180'
                    )}
                  />
                </button>
              </Tooltip>
            </div>
          </div>
          {regularCards.length > 0 && (
            <div
              className={cn(
                'flex shrink-0 justify-center-safe gap-2 p-3 overflow-x-auto',
                'transition-all duration-300 ease-in-out',
                !hideParticipents
                  ? 'max-h-full p-3 -mt-3 opacity-100'
                  : 'max-h-0 p-0 mt-0 opacity-0'
              )}
            >
              {regularCards.map((card, index) => (
                <div key={index} className="shrink-0 w-40 h-24">
                  {card}
                </div>
              ))}
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
        className={cn('grid size-full gap-3 p-3', className)}
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
