import type { TMetricsSample } from '@sharkord/shared';
import { gte, sql } from 'drizzle-orm';
import { db } from '..';
import { metricsSamples } from '../schema';

const getStoredMetricsSamples = async (
  since: number,
  bucketMs: number
): Promise<TMetricsSample[]> => {
  const t = metricsSamples;
  const bucket = sql`cast((${t.timestamp} - ${since}) / ${bucketMs} as integer)`;

  return db
    .select({
      timestamp: sql<number>`max(${t.timestamp})`,
      cpu: sql<number>`avg(${t.cpu})`,
      memory: sql<number>`avg(${t.memory})`,
      systemCpu: sql<number>`avg(${t.systemCpu})`,
      systemMemoryUsed: sql<number>`avg(${t.systemMemoryUsed})`,
      systemMemoryTotal: sql<number>`max(${t.systemMemoryTotal})`,
      workerCpu: sql<number | null>`avg(${t.workerCpu})`,
      workerMemory: sql<number | null>`avg(${t.workerMemory})`,
      voiceRx: sql<number | null>`avg(${t.voiceRx})`,
      voiceTx: sql<number | null>`avg(${t.voiceTx})`,
      onlineUsers: sql<number>`avg(${t.onlineUsers})`,
      voiceUsers: sql<number>`avg(${t.voiceUsers})`,
      voiceProducers: sql<number>`avg(${t.voiceProducers})`,
      voiceConsumers: sql<number>`avg(${t.voiceConsumers})`,
      eventLoopLag: sql<number>`max(${t.eventLoopLag})`
    })
    .from(t)
    .where(gte(t.timestamp, since))
    .groupBy(bucket)
    .orderBy(bucket)
    .all();
};

export { getStoredMetricsSamples };
