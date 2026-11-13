import { Skeleton } from '@sharkord/ui';
import { memo } from 'react';

const MarketplaceSkeleton = memo(() => (
  <div className="divide-y rounded-lg border">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 px-4 py-3">
        <Skeleton className="h-9 w-9 rounded-md" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-3/4" />
        </div>
        <Skeleton className="h-8 w-20" />
      </div>
    ))}
  </div>
));

export { MarketplaceSkeleton };
