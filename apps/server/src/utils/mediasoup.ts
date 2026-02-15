import mediasoup from 'mediasoup';
import { config, SERVER_PUBLIC_IP } from '../config.js';
import { MEDIASOUP_BINARY_PATH } from '../helpers/paths.js';
import { logger } from '../logger.js';
import { IS_PRODUCTION } from './env.js';

let mediaSoupWorker: mediasoup.types.Worker<mediasoup.types.AppData>;
let webRtcServer: mediasoup.types.WebRtcServer<mediasoup.types.AppData>;
let webRtcServerListenInfo: { ip: string; announcedAddress?: string };

const loadMediasoup = async () => {
  const port = +config.webRtc.port;

  const workerConfig: mediasoup.types.WorkerSettings = {
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

  if (IS_PRODUCTION) {
    const announcedAddress = config.webRtc.announcedAddress || SERVER_PUBLIC_IP;

    webRtcServer = await mediaSoupWorker.createWebRtcServer({
      listenInfos: [
        { protocol: 'udp', ip: '0.0.0.0', announcedAddress, port },
        { protocol: 'tcp', ip: '0.0.0.0', announcedAddress, port }
      ]
    });

    webRtcServerListenInfo = { ip: '0.0.0.0', announcedAddress };

    logger.debug(
      `WebRtcServer created on port ${port} with announcedAddress ${announcedAddress}`
    );
  } else {
    webRtcServer = await mediaSoupWorker.createWebRtcServer({
      listenInfos: [
        { protocol: 'udp', ip: '127.0.0.1', port },
        { protocol: 'tcp', ip: '127.0.0.1', port }
      ]
    });

    webRtcServerListenInfo = { ip: '127.0.0.1' };

    logger.debug(`WebRtcServer created on 127.0.0.1:${port} (dev mode)`);
  }
};

export { loadMediasoup, mediaSoupWorker, webRtcServer, webRtcServerListenInfo };
