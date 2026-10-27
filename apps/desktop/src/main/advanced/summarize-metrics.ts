import type { ProcessMetric } from 'electron';
import type { TProcessGroup, TProcessUsage } from '../../shared/types';

type TMetric = Pick<ProcessMetric, 'type'> & {
  memory: Pick<ProcessMetric['memory'], 'workingSetSize'>;
  cpu: Pick<ProcessMetric['cpu'], 'percentCPUUsage'>;
};

const GROUP_BY_TYPE: Record<string, TProcessGroup> = {
  Browser: 'Main',
  Tab: 'Renderer',
  GPU: 'GPU',
  Utility: 'Utility'
};

const GROUP_ORDER: TProcessGroup[] = [
  'Main',
  'Renderer',
  'GPU',
  'Utility',
  'Other'
];

const summarizeMetrics = (metrics: TMetric[]): TProcessUsage[] => {
  const usageByGroup = new Map<TProcessGroup, TProcessUsage>();

  for (const metric of metrics) {
    const group = GROUP_BY_TYPE[metric.type] ?? 'Other';

    const usage = usageByGroup.get(group) ?? {
      group,
      count: 0,
      memoryKb: 0,
      cpuPercent: 0
    };

    usage.count += 1;
    usage.memoryKb += metric.memory.workingSetSize;
    usage.cpuPercent += metric.cpu.percentCPUUsage;

    usageByGroup.set(group, usage);
  }

  const usages: TProcessUsage[] = [];

  for (const group of GROUP_ORDER) {
    const usage = usageByGroup.get(group);

    if (usage) {
      usages.push(usage);
    }
  }

  return usages;
};

export { summarizeMetrics };
