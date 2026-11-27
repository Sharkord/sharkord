import { describe, expect, test } from 'bun:test';
import {
  formatAxisTime,
  formatPercent,
  getChartScale,
  getGapIndexes,
  getLatestValue,
  getRangeTotal
} from '../helpers';

describe('metrics chart helpers', () => {
  test('should format percentages with one decimal', () => {
    expect(formatPercent(0.0133)).toBe('0.0%');
    expect(formatPercent(45.33)).toBe('45.3%');
    expect(formatPercent(100)).toBe('100.0%');
  });

  test('should leave headroom above the peak', () => {
    expect(getChartScale(40)).toBe(50);
  });

  test('should never return a zero scale', () => {
    expect(getChartScale(0)).toBe(1);
    expect(getChartScale(null)).toBe(1);
    expect(getChartScale(undefined)).toBe(1);
  });

  test('should return the newest value that is present', () => {
    expect(getLatestValue([1, 2, null])).toBe(2);
  });

  test('should return nothing when every value is missing', () => {
    expect(getLatestValue([])).toBeUndefined();
    expect(getLatestValue([null, null])).toBeUndefined();
  });

  test('axis labels show the time of day for ranges up to 24 hours', () => {
    const timestamp = new Date(2026, 10, 24, 14, 45).getTime();
    const label = formatAxisTime(timestamp, 15 * 60 * 1000);

    expect(label).toContain('45');
    expect(label).not.toContain('Nov');
  });

  test('axis labels show the day for the 7d and 30d ranges', () => {
    const timestamp = new Date(2026, 10, 24, 14, 45).getTime();

    expect(formatAxisTime(timestamp, 7 * 24 * 60 * 60 * 1000)).toBe('Nov 24');
  });

  test('range total multiplies each per second value by the sample spacing', () => {
    expect(getRangeTotal([0, 5, 10], [100, 200, 300])).toBe(3000);
  });

  test('range total skips the time sampling was off and missing values', () => {
    expect(getRangeTotal([0, 5, 3600, 3605], [100, null, 100, 100])).toBe(1500);
  });

  test('range total is zero with fewer than two points', () => {
    expect(getRangeTotal([], [])).toBe(0);
    expect(getRangeTotal([0], [100])).toBe(0);
  });

  test('gaps are found where sampling was off', () => {
    expect(getGapIndexes([0, 5, 10, 7210, 7215])).toEqual([3]);
  });

  test('normal sample jitter is not a gap', () => {
    expect(getGapIndexes([0, 5, 11, 15, 21, 25])).toEqual([]);
  });

  test('a partial bucket at the end does not turn normal spacing into gaps', () => {
    expect(getGapIndexes([0, 60, 120, 180, 190])).toEqual([]);
  });

  test('no gaps with fewer than two points', () => {
    expect(getGapIndexes([])).toEqual([]);
    expect(getGapIndexes([0])).toEqual([]);
  });

  test('range total uses the usual spacing even with a partial bucket at the end', () => {
    expect(getRangeTotal([0, 60, 120, 180, 190], [1, 1, 1, 1, 1])).toBe(300);
  });
});
