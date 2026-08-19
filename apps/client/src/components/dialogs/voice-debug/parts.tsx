import type { TVoiceDebugStat } from '@/helpers/voice-debug';
import { cn } from '@sharkord/ui';
import { memo, type ReactNode } from 'react';
import { formatValue, getScalarEntries, type TTone } from './helpers';

const TONE_CLASSES: Record<TTone, string> = {
  ok: 'bg-green-500/15 text-green-500',
  warn: 'bg-amber-500/15 text-amber-500',
  bad: 'bg-destructive/15 text-destructive',
  muted: 'bg-muted text-muted-foreground'
};

type TPillProps = {
  label: string;
  value: ReactNode;
  tone?: TTone;
};

const Pill = memo(({ label, value, tone = 'muted' }: TPillProps) => (
  <span
    className={cn(
      'inline-flex max-w-full items-center gap-1.5 rounded px-2 py-0.5 font-mono text-xs',
      TONE_CLASSES[tone]
    )}
  >
    <span className="shrink-0 opacity-70">{label}</span>
    <span className="min-w-0 break-all font-semibold">{value}</span>
  </span>
));

type TSectionProps = {
  title: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
};

const Section = memo(({ title, actions, children }: TSectionProps) => (
  <div className="min-w-0 rounded border border-border/60 bg-card/40">
    <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-3 py-2">
      <span className="min-w-0 break-all font-mono text-xs font-semibold">
        {title}
      </span>
      <div className="ml-auto flex min-w-0 flex-wrap items-center gap-1.5">
        {actions}
      </div>
    </div>
    <div className="min-w-0 space-y-2 p-3">{children}</div>
  </div>
));

type TFieldsProps = {
  data: Record<string, unknown>;
};

const Fields = memo(({ data }: TFieldsProps) => (
  <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-x-4 gap-y-0.5">
    {getScalarEntries(data).map(([key, value]) => (
      <div key={key} className="flex min-w-0 gap-2 font-mono text-[11px]">
        <span className="shrink-0 truncate text-muted-foreground">{key}</span>
        <span className="min-w-0 flex-1 break-all text-right">
          {formatValue(value)}
        </span>
      </div>
    ))}
  </div>
));

type TStatGroupProps = {
  stats: TVoiceDebugStat[];
  emptyLabel: string;
};

const StatGroup = memo(({ stats, emptyLabel }: TStatGroupProps) => {
  if (!stats.length) {
    return (
      <p className="font-mono text-[11px] text-muted-foreground">
        {emptyLabel}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {stats.map((stat, index) => (
        <div
          key={typeof stat.id === 'string' ? stat.id : index}
          className="min-w-0 rounded bg-muted/40 p-2"
        >
          <p className="mb-1 break-all font-mono text-[11px] font-semibold text-primary">
            {String(stat.type)}
            {typeof stat.id === 'string' ? ` · ${stat.id}` : ''}
          </p>
          <Fields data={stat} />
        </div>
      ))}
    </div>
  );
});

export { Fields, Pill, Section, StatGroup };
