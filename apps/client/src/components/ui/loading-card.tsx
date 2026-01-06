import { Card, CardContent } from '@/components/ui/card';
import Spinner from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { memo } from 'react';

type TLoadingCardProps = {
  className?: string;
};

const LoadingCard = memo(({ className }: TLoadingCardProps) => {
  return (
    <Card>
      <CardContent
        className={cn(
          'h-48 flex items-center justify-center flex-col gap-2',
          className
        )}
      >
        <Spinner size="md" />
        <span className="text-center text-sm text-muted-foreground">
          Loading...
        </span>
      </CardContent>
    </Card>
  );
});

LoadingCard.displayName = 'LoadingCard';

export { LoadingCard };
