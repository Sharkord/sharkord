import { METRICS_ROLLUP_INTERVAL_MS } from '@sharkord/shared';
import {
  deleteMetricsSamplesBefore,
  insertMetricsSample
} from '../db/mutations/metrics';
import {
  getRecentMetricsAverage,
  METRICS_RETENTION_MS
} from '../utils/metrics-samples';

const rollupMetrics = async () => {
  const now = Date.now();
  const average = getRecentMetricsAverage(METRICS_ROLLUP_INTERVAL_MS);

  await deleteMetricsSamplesBefore(now - METRICS_RETENTION_MS);

  if (!average) return;

  await insertMetricsSample({
    ...average,
    timestamp: now - (now % METRICS_ROLLUP_INTERVAL_MS)
  });
};

export { rollupMetrics };
