import { ChevronRight } from 'lucide-react';
import { memo, type ReactNode } from 'react';
import { cn } from '../lib/utils';

type TDetailsSectionProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

const DetailsSection = memo(
  ({ title, children, className }: TDetailsSectionProps) => (
    <details className={cn('group rounded-md border border-border', className)}>
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm font-medium select-none [&::-webkit-details-marker]:hidden">
        <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
        {title}
      </summary>
      <div className="flex flex-col gap-4 border-t border-border p-3">
        {children}
      </div>
    </details>
  )
);

export { DetailsSection };
