import { describe, expect, test } from 'bun:test';
import type { ProcessMetric } from 'electron';
import { summarizeMetrics } from '../summarize-metrics';

const metric = (
  type: ProcessMetric['type'],
  workingSetSize: number,
  percentCPUUsage: number
) => ({
  type,
  memory: { workingSetSize },
  cpu: { percentCPUUsage }
});

describe('summarizeMetrics', () => {
  test('names the processes after what they do', () => {
    const usages = summarizeMetrics([
      metric('Browser', 100, 1),
      metric('Tab', 200, 2),
      metric('GPU', 50, 0.5),
      metric('Utility', 20, 0)
    ]);

    expect(usages.map((usage) => usage.group)).toEqual([
      'Main',
      'Renderer',
      'GPU',
      'Utility'
    ]);
  });

  test('adds up the processes of the same kind', () => {
    const usages = summarizeMetrics([
      metric('Tab', 200, 2),
      metric('Tab', 300, 1.5)
    ]);

    expect(usages).toEqual([
      { group: 'Renderer', count: 2, memoryKb: 500, cpuPercent: 3.5 }
    ]);
  });

  test('puts processes of an unknown kind together under other', () => {
    const usages = summarizeMetrics([
      metric('Zygote', 10, 0),
      metric('Sandbox helper', 5, 0)
    ]);

    expect(usages).toEqual([
      { group: 'Other', count: 2, memoryKb: 15, cpuPercent: 0 }
    ]);
  });

  test('keeps a fixed order whatever order chromium reports them in', () => {
    const usages = summarizeMetrics([
      metric('Utility', 1, 0),
      metric('Zygote', 1, 0),
      metric('Tab', 1, 0),
      metric('Browser', 1, 0)
    ]);

    expect(usages.map((usage) => usage.group)).toEqual([
      'Main',
      'Renderer',
      'Utility',
      'Other'
    ]);
  });

  test('has nothing to report without processes', () => {
    expect(summarizeMetrics([])).toEqual([]);
  });
});
