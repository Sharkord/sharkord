import mediasoup from 'mediasoup';
import { config } from '../config.js';
import { logger } from '../logger.js';

let mediaSoupWorker: mediasoup.types.Worker<mediasoup.types.AppData>;

const loadMediasoup = async () => {
  mediaSoupWorker = await mediasoup.createWorker({
    rtcMaxPort: config.mediasoup.worker.rtcMaxPort,
    rtcMinPort: config.mediasoup.worker.rtcMinPort
  });

  mediaSoupWorker.on('died', (error) => {
    logger.error('Mediasoup worker died', error);

    setTimeout(() => process.exit(0), 2000);
  });

  logger.debug('Mediasoup worker loaded');
};

export { loadMediasoup, mediaSoupWorker };
