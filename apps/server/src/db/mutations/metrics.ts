import type { TMetricsSample } from '@sharkord/shared';
import { lt } from 'drizzle-orm';
import { db } from '..';
import { metricsSamples } from '../schema';

const insertMetricsSample = async (sample: TMetricsSample) =>
  db.insert(metricsSamples).values(sample).onConflictDoNothing().run();

const deleteMetricsSamplesBefore = async (before: number) =>
  db.delete(metricsSamples).where(lt(metricsSamples.timestamp, before)).run();

export { deleteMetricsSamplesBefore, insertMetricsSample };
