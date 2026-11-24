import { memo } from 'react';

type TMetricStatProps = {
  label: string;
  value: string;
};

const MetricStat = memo(({ label, value }: TMetricStatProps) => (
  <div className="flex items-baseline justify-between gap-2 rounded-lg border bg-muted/30 p-4">
    <span className="text-sm font-medium text-muted-foreground">{label}</span>
    <span className="text-lg font-semibold">{value}</span>
  </div>
));

export { MetricStat };
