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
          <div className="flex-1 p-4 min-h-0">{pinnedCard}</div>

          {regularCards.length > 0 && (
            <div className="h-40">
              <div className="flex items-center justify-center h-full">
                <div
                  className={cn(
                    'grid gap-3 h-full max-w-full',
                    getGridClass(Math.min(regularCards.length, 6))
                  )}
                >
                  {regularCards.slice(0, 6).map((card, index) => (
                    <div key={index} className="h-full min-w-0">
                      {card}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div
        className={cn('flex items-center justify-center h-full p-4', className)}
      >
        <div className={cn('grid gap-4 w-full h-fit', getGridClass(gridCols))}>
          {regularCards}
        </div>
      </div>
    );
  }
);

export { VoiceGrid };
