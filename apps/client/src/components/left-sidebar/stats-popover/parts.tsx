import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { memo } from 'react';

export type TStatTone = 'default' | 'good' | 'warn' | 'bad';

const TONE_CLASSES: Record<TStatTone, string> = {
  default: 'text-foreground',
  good: 'text-green-500',
  warn: 'text-yellow-500',
  bad: 'text-destructive'
};

type TStatsSectionProps = {
  title: string;
  icon?: LucideIcon;
  className?: string;
  children: React.ReactNode;
};

export const StatsSection = memo(
  ({ title, icon: Icon, className, children }: TStatsSectionProps) => (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {title}
      </div>
      <div className="space-y-1 rounded-md border border-border/50 bg-secondary/35 px-2.5 py-2">
        {children}
      </div>
    </div>
  )
);

type TStatsRowProps = {
  label: string;
  value: React.ReactNode;
  tone?: TStatTone;
};

export const StatsRow = memo(
  ({ label, value, tone = 'default' }: TStatsRowProps) => (
    <div className="flex items-baseline justify-between gap-3 text-xs">
      <span className="truncate text-muted-foreground">{label}</span>
      <span className={cn('shrink-0 tabular-nums', TONE_CLASSES[tone])}>
        {value}
      </span>
    </div>
  )
);

type TStatsEmptyProps = {
  children: React.ReactNode;
};

export const StatsEmpty = memo(({ children }: TStatsEmptyProps) => (
  <div className="text-xs text-muted-foreground">{children}</div>
));
