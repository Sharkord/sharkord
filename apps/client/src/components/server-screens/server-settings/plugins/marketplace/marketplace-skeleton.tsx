import { Skeleton } from '@sharkord/ui';
import { memo } from 'react';

const MarketplaceSkeleton = memo(() => (
  <div className="space-y-3">
    {Array.from({ length: 3 }).map((_, i) => (
      <div
        key={i}
        className="flex items-start gap-4 p-4 rounded-lg border bg-card"
      >
        <Skeleton className="w-12 h-12 rounded-md" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    ))}
  </div>
));

export { MarketplaceSkeleton };
