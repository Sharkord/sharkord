import mediasoup from 'mediasoup';
import { config } from '../config.js';
import { MEDIASOUP_BINARY_PATH } from '../helpers/paths.js';
import { logger } from '../logger.js';

let mediaSoupWorker: mediasoup.types.Worker<mediasoup.types.AppData>;

const loadMediasoup = async () => {
  const workerConfig: mediasoup.types.WorkerSettings = {
    rtcMinPort: +config.mediasoup.worker.rtcMinPort,
    rtcMaxPort: +config.mediasoup.worker.rtcMaxPort,
    logLevel: 'debug',
    disableLiburing: true,
    workerBin: MEDIASOUP_BINARY_PATH
  };

  logger.debug(
    `Loading mediasoup worker with config ${JSON.stringify(workerConfig, null, 2)}`
  );

  mediaSoupWorker = await mediasoup.createWorker(workerConfig);

  mediaSoupWorker.on('died', (error) => {
    logger.error('Mediasoup worker died', error);

    setTimeout(() => process.exit(0), 2000);
  });

  logger.debug('Mediasoup worker loaded');
};

export { loadMediasoup, mediaSoupWorker };
