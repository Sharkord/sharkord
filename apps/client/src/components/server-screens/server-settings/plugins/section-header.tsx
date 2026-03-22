import { cn } from '@/lib/utils';
import { Button, CardDescription, CardHeader, CardTitle } from '@sharkord/ui';
import { RefreshCw } from 'lucide-react';
import { memo } from 'react';

type TSectionHeaderProps = {
  title: string;
  description: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  refreshDisabled?: boolean;
  refreshLabel?: string;
};

const SectionHeader = memo(
  ({
    title,
    description,
    onRefresh,
    isRefreshing = false,
    refreshDisabled = false,
    refreshLabel = 'Refresh'
  }: TSectionHeaderProps) => {
    return (
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={refreshDisabled}
              className="shrink-0"
            >
              <RefreshCw
                className={cn('w-4 h-4 mr-2', isRefreshing && 'animate-spin')}
              />
              {refreshLabel}
            </Button>
          )}
        </div>
      </CardHeader>
    );
  }
);

export { SectionHeader };
