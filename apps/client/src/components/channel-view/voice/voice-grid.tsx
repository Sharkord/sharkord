import { cn } from '@/lib/utils';
import { isValidElement, memo, useMemo, type ReactNode } from 'react';

type TVoiceGridProps = {
  children: ReactNode[];
  pinnedCardId?: string;
  className?: string;
};

const VoiceGrid = memo(
  ({ children, pinnedCardId, className }: TVoiceGridProps) => {
    const { gridCols, pinnedCard, regularCards } = useMemo(() => {
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

        return {
          gridCols: regular.length <= 4 ? regular.length : 4,
          pinnedCard: pinned,
          regularCards: regular
        };
      }

      const totalCards = childArray.length;

      let cols = 1;

      if (totalCards <= 1) cols = 1;
      else if (totalCards <= 4) cols = 2;
      else if (totalCards <= 9) cols = 3;
      else if (totalCards <= 16) cols = 4;
      else cols = 5;

      return {
        gridCols: cols,
        pinnedCard: null,
        regularCards: childArray
      };
    }, [children, pinnedCardId]);

    const getGridClass = (cols: number) => {
      switch (cols) {
        case 1:
          return 'grid-cols-1';
        case 2:
          return 'grid-cols-2';
        case 3:
          return 'grid-cols-3';
        case 4:
          return 'grid-cols-4';
        case 5:
          return 'grid-cols-5';
        default:
          return 'grid-cols-4';
      }
    };

    if (pinnedCardId && pinnedCard) {
      return (
        <div className={cn('flex flex-col h-full', className)}>
          <div className="flex-1 p-2 min-h-0">{pinnedCard}</div>

          {regularCards.length > 0 && (
            <div className="flex-shrink-0 border-t border-border bg-card/50">
              <div className="flex justify-center gap-2 p-2 overflow-x-auto">
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

    const getRowCount = (totalCards: number, cols: number) => {
      return Math.ceil(totalCards / cols);
    };

    const getGridRowsClass = (rows: number) => {
      switch (rows) {
        case 1:
          return 'grid-rows-1';
        case 2:
          return 'grid-rows-2';
        case 3:
          return 'grid-rows-3';
        case 4:
          return 'grid-rows-4';
        case 5:
          return 'grid-rows-5';
        default:
          return 'grid-rows-4';
      }
    };

    const rows = getRowCount(regularCards.length, gridCols);

    return (
      <div
        className={cn(
          'grid h-full p-2 gap-2',
          getGridClass(gridCols),
          getGridRowsClass(rows),
          className
        )}
      >
        {regularCards}
      </div>
    );
  }
);

export { VoiceGrid };
