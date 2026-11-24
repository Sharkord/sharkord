import {
  METRICS_MEMORY_RANGE_MS,
  METRICS_RANGE_MS,
  MetricsRange,
  Permission
} from '@sharkord/shared';
import { z } from 'zod';
import { getStoredMetricsSamples } from '../../db/queries/metrics';
import { getSettings } from '../../db/queries/server';
import {
  getMetricsSamples,
  METRICS_MAX_POINTS
} from '../../utils/metrics-samples';
import { protectedProcedure } from '../../utils/trpc';

const getMetricsRoute = protectedProcedure
  .input(z.object({ range: z.enum(MetricsRange) }))
  .query(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.VIEW_METRICS);

    const { metricsEnabled } = await getSettings();

    if (!metricsEnabled) {
      return { enabled: false, samples: [] };
    }

    const rangeMs = METRICS_RANGE_MS[input.range];

    if (rangeMs <= METRICS_MEMORY_RANGE_MS) {
      return { enabled: true, samples: getMetricsSamples(rangeMs) };
    }

    const samples = await getStoredMetricsSamples(
      Date.now() - rangeMs,
      Math.ceil(rangeMs / METRICS_MAX_POINTS)
    );

    return { enabled: true, samples };
  });

export { getMetricsRoute };
