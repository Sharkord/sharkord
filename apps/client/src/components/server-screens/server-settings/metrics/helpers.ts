import { METRICS_MEMORY_RANGE_MS } from '@sharkord/shared';
import { format } from 'date-fns';
import { filesize } from 'filesize';

export const COUNT_INCRS = [
  1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000
];

export const BYTE_INCRS = Array.from({ length: 50 }, (_, i) => 2 ** i);

export const getChartScale = (peak: number | null | undefined) =>
  peak && peak > 0 ? peak * 1.25 : 1;

export const getLatestValue = (values: (number | null)[]) => {
  for (let i = values.length - 1; i >= 0; i--) {
    const value = values[i];

    if (value !== null && value !== undefined) return value;
  }

  return undefined;
};

export const formatPercent = (value: number) => `${value.toFixed(1)}%`;

export const formatBytes = (value: number) =>
  filesize(value, { standard: 'jedec' });

export const formatBytesPerSecond = (value: number) =>
  `${formatBytes(value)}/s`;

export const formatCount = (value: number) =>
  Number.isInteger(value) ? `${value}` : value.toFixed(1);

export const formatMilliseconds = (value: number) => `${Math.round(value)} ms`;

export const formatAxisTime = (timestampMs: number, rangeMs: number) =>
  format(timestampMs, rangeMs > METRICS_MEMORY_RANGE_MS ? 'MMM d' : 'p');

// a gap several times the usual spacing is time sampling was off, not a slow sample
const GAP_FACTOR = 3;

// median, so a partial bucket at the edge of a gap can't shrink the step like a minimum would
export const getSampleStep = (timestamps: ArrayLike<number>) => {
  const diffs: number[] = [];

  for (let i = 1; i < timestamps.length; i++) {
    diffs.push(timestamps[i]! - timestamps[i - 1]!);
  }

  diffs.sort((a, b) => a - b);

  return diffs[Math.floor(diffs.length / 2)];
};

// indexes of the points that start again after a gap
export const getGapIndexes = (timestamps: ArrayLike<number>) => {
  const step = getSampleStep(timestamps);
  const indexes: number[] = [];

  if (step === undefined) return indexes;

  for (let i = 1; i < timestamps.length; i++) {
    if (timestamps[i]! - timestamps[i - 1]! > step * GAP_FACTOR) {
      indexes.push(i);
    }
  }

  return indexes;
};

export const getRangeTotal = (
  timestamps: number[],
  values: (number | null)[]
) => {
  const step = getSampleStep(timestamps);

  if (step === undefined) return 0;

  let total = 0;

  for (const value of values) {
    total += (value ?? 0) * step;
  }

  return total;
};
