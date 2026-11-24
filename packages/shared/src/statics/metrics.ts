export type TDiskMetrics = {
  totalSpace: number;
  usedSpace: number;
  freeSpace: number;
  sharkordUsedSpace: number;
};

export type TPluginStorageUsage = {
  pluginId: string;
  fileCount: number;
  usedSpace: number;
  installed: boolean;
};

export enum MetricsRange {
  FIVE_MINUTES = '5m',
  FIFTEEN_MINUTES = '15m',
  ONE_HOUR = '1h',
  SIX_HOURS = '6h',
  TWENTY_FOUR_HOURS = '24h',
  SEVEN_DAYS = '7d',
  THIRTY_DAYS = '30d'
}

export const METRICS_RANGE_MS: Record<MetricsRange, number> = {
  [MetricsRange.FIVE_MINUTES]: 5 * 60_000,
  [MetricsRange.FIFTEEN_MINUTES]: 15 * 60_000,
  [MetricsRange.ONE_HOUR]: 60 * 60_000,
  [MetricsRange.SIX_HOURS]: 6 * 60 * 60_000,
  [MetricsRange.TWENTY_FOUR_HOURS]: 24 * 60 * 60_000,
  [MetricsRange.SEVEN_DAYS]: 7 * 24 * 60 * 60_000,
  [MetricsRange.THIRTY_DAYS]: 30 * 24 * 60 * 60_000
};

export const METRICS_SAMPLE_INTERVAL_MS = 5000;

export const METRICS_MEMORY_RANGE_MS =
  METRICS_RANGE_MS[MetricsRange.TWENTY_FOUR_HOURS];

export const METRICS_ROLLUP_INTERVAL_MS = 60_000;

export type TMetricsSample = {
  timestamp: number;
  cpu: number;
  memory: number;
  systemCpu: number;
  systemMemoryUsed: number;
  systemMemoryTotal: number;
  workerCpu: number | null;
  workerMemory: number | null;
  voiceRx: number | null;
  voiceTx: number | null;
  onlineUsers: number;
  voiceUsers: number;
  voiceProducers: number;
  voiceConsumers: number;
  eventLoopLag: number;
};
