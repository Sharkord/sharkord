import { CronJob } from 'cron';
import { logger } from '../logger';
import { cleanupFiles } from './cleanup-files';
import { rollupMetrics } from './rollup-metrics';
import { sampleMetrics } from './sample-metrics';

enum CRON_TIMES {
  EVERY_15_MINUTES = '*/15 * * * *',
  EVERY_MINUTE = '* * * * *',
  EVERY_5_SECONDS = '*/5 * * * * *'
}

const loadCrons = () => {
  logger.debug('Loading crons...');

  new CronJob(
    CRON_TIMES.EVERY_15_MINUTES,
    cleanupFiles,
    null,
    true,
    'Europe/Lisbon',
    null,
    true
  );

  new CronJob(
    CRON_TIMES.EVERY_5_SECONDS,
    sampleMetrics,
    null,
    true,
    'Europe/Lisbon',
    null,
    true
  );

  new CronJob(
    CRON_TIMES.EVERY_MINUTE,
    rollupMetrics,
    null,
    true,
    'Europe/Lisbon'
  );
};

export { loadCrons };
