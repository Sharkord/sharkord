import {
  METRICS_MEMORY_RANGE_MS,
  METRICS_RANGE_MS,
  METRICS_SAMPLE_INTERVAL_MS,
  MetricsRange,
  type TMetricsSample
} from '@sharkord/shared';

const METRICS_MAX_SAMPLES =
  METRICS_MEMORY_RANGE_MS / METRICS_SAMPLE_INTERVAL_MS;

const METRICS_RETENTION_MS = METRICS_RANGE_MS[MetricsRange.THIRTY_DAYS];

const METRICS_MAX_POINTS = 300;

const samples: TMetricsSample[] = [];

const addMetricsSample = (sample: TMetricsSample) => {
  samples.push(sample);

  if (samples.length > METRICS_MAX_SAMPLES) {
    samples.shift();
  }
};

const clearMetricsSamples = () => {
  samples.length = 0;
};

type TNumericKey = Exclude<keyof TMetricsSample, 'timestamp'>;

const valuesOf = (bucket: TMetricsSample[], key: TNumericKey) =>
  bucket.map((sample) => sample[key]).filter((value) => value !== null);

const averageOf = (bucket: TMetricsSample[], key: TNumericKey) => {
  const values = valuesOf(bucket, key);

  if (values.length === 0) return null;

  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const maxOf = (bucket: TMetricsSample[], key: TNumericKey) => {
  const values = valuesOf(bucket, key);

  if (values.length === 0) return null;

  return Math.max(...values);
};

const averageBucket = (bucket: TMetricsSample[]): TMetricsSample => {
  const last = bucket[bucket.length - 1]!;

  return {
    timestamp: last.timestamp,
    cpu: averageOf(bucket, 'cpu') ?? 0,
    memory: averageOf(bucket, 'memory') ?? 0,
    systemCpu: averageOf(bucket, 'systemCpu') ?? 0,
    systemMemoryUsed: averageOf(bucket, 'systemMemoryUsed') ?? 0,
    systemMemoryTotal: last.systemMemoryTotal,
    workerCpu: averageOf(bucket, 'workerCpu'),
    workerMemory: averageOf(bucket, 'workerMemory'),
    voiceRx: averageOf(bucket, 'voiceRx'),
    voiceTx: averageOf(bucket, 'voiceTx'),
    onlineUsers: averageOf(bucket, 'onlineUsers') ?? 0,
    voiceUsers: averageOf(bucket, 'voiceUsers') ?? 0,
    voiceProducers: averageOf(bucket, 'voiceProducers') ?? 0,
    voiceConsumers: averageOf(bucket, 'voiceConsumers') ?? 0,
    eventLoopLag: maxOf(bucket, 'eventLoopLag') ?? 0
  };
};

const downsampleSamples = (
  input: TMetricsSample[],
  maxPoints: number
): TMetricsSample[] => {
  if (input.length <= maxPoints) return input;

  const bucketSize = Math.ceil(input.length / maxPoints);
  const result: TMetricsSample[] = [];

  for (let i = 0; i < input.length; i += bucketSize) {
    result.push(averageBucket(input.slice(i, i + bucketSize)));
  }

  return result;
};

const getMetricsSamples = (rangeMs: number) => {
  const since = Date.now() - rangeMs;
  const inRange = samples.filter(({ timestamp }) => timestamp >= since);

  return downsampleSamples(inRange, METRICS_MAX_POINTS);
};

const getRecentMetricsAverage = (windowMs: number) => {
  const since = Date.now() - windowMs;
  const recent = samples.filter(({ timestamp }) => timestamp >= since);

  if (recent.length === 0) return null;

  return averageBucket(recent);
};

export {
  addMetricsSample,
  clearMetricsSamples,
  downsampleSamples,
  getMetricsSamples,
  getRecentMetricsAverage,
  METRICS_MAX_POINTS,
  METRICS_MAX_SAMPLES,
  METRICS_RETENTION_MS
};
