import type { LucideIcon } from 'lucide-react';
import { memo, type ReactNode } from 'react';
import { cn } from '../lib/utils';

type TUpdateTone = 'success' | 'info' | 'warning' | 'error' | 'muted';

const TONE_CLASSES: Record<TUpdateTone, string> = {
  success: 'bg-emerald-500/10 text-emerald-500',
  info: 'bg-sky-500/10 text-sky-500',
  warning: 'bg-amber-500/10 text-amber-500',
  error: 'bg-red-500/10 text-red-500',
  muted: 'bg-muted text-muted-foreground'
};

type TUpdateVersion = {
  label: string;
  value: string;
};

type TUpdatePanelProps = {
  tone: TUpdateTone;
  icon: LucideIcon;
  busy?: boolean;
  title: string;
  description: string;
  progress?: number;
  action?: ReactNode;
  versions: TUpdateVersion[];
};

const ProgressBar = memo(({ value }: { value: number }) => (
  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
    <div
      className="h-full rounded-full bg-sky-500 transition-[width]"
      style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
    />
  </div>
));

const VersionItem = memo(({ label, value }: TUpdateVersion) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className="font-mono text-sm">{value}</span>
  </div>
));

const UpdatePanel = memo(
  ({
    tone,
    icon: Icon,
    busy,
    title,
    description,
    progress,
    action,
    versions
  }: TUpdatePanelProps) => (
    <div className="rounded-lg border">
      <div className="flex items-start gap-4 p-4">
        <div
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-full',
            TONE_CLASSES[tone]
          )}
        >
          <Icon className={cn('size-5', busy && 'animate-spin')} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-sm font-medium">{title}</span>
          <span className="text-sm text-muted-foreground">{description}</span>
          {progress !== undefined && <ProgressBar value={progress} />}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="grid grid-cols-2 gap-4 border-t p-4">
        {versions.map(({ label, value }) => (
          <VersionItem key={label} label={label} value={value} />
        ))}
      </div>
    </div>
  )
);

export { UpdatePanel };
export type { TUpdatePanelProps, TUpdateTone };
