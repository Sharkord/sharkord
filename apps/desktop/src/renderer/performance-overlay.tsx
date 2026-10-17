import { Card, Separator } from '@sharkord/ui';
import { filesize } from 'filesize';
import { memo, useEffect, useMemo, useState } from 'react';
import type { TProcessUsage } from '../shared/types';

const BYTES_PER_KB = 1024;

const formatSize = (kb: number) =>
  filesize(kb * BYTES_PER_KB, { standard: 'jedec' });

const formatCpu = (percent: number) => `${percent.toFixed(1)}% CPU`;

const PerformanceOverlay = memo(() => {
  const [usage, setUsage] = useState<TProcessUsage[]>([]);

  useEffect(() => window.performanceOverlay.onUpdate(setUsage), []);

  const totalKb = useMemo(
    () => usage.reduce((total, row) => total + row.memoryKb, 0),
    [usage]
  );

  return (
    <Card className="[-webkit-app-region:drag] h-screen gap-2 rounded-none border-0 px-4 py-3 font-mono text-xs">
      {usage.map((row) => (
        <div key={row.group} className="grid grid-cols-[5rem_1fr_1fr] gap-2">
          <span>
            {row.count > 1 ? `${row.group} x${row.count}` : row.group}
          </span>
          <span className="text-right">{formatSize(row.memoryKb)}</span>
          <span className="text-muted-foreground text-right">
            {formatCpu(row.cpuPercent)}
          </span>
        </div>
      ))}
      <Separator />
      <div className="grid grid-cols-[5rem_1fr] gap-2 font-semibold">
        <span>Total</span>
        <span className="text-right">{formatSize(totalKb)}</span>
      </div>
    </Card>
  );
});

export { PerformanceOverlay };
