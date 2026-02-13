import mediasoup from 'mediasoup';
import { config, SERVER_PUBLIC_IP } from '../config.js';
import { MEDIASOUP_BINARY_PATH } from '../helpers/paths.js';
import { logger } from '../logger.js';

let mediaSoupWorker: mediasoup.types.Worker<mediasoup.types.AppData>;
let webRtcServer: mediasoup.types.WebRtcServer | undefined;

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

  // Create WebRtcServer for UDP port multiplexing
  // Only create if single port is configured
  const useSinglePort = 
    config.mediasoup.worker.rtcMinPort === config.mediasoup.worker.rtcMaxPort;

  if (useSinglePort) {
    try {
      // Use custom WebRTC host if specified, otherwise fall back to public IP
      const announcedAddress = config.mediasoup.worker.webrtcHost || SERVER_PUBLIC_IP;

      const listenInfos: any[] = [
        {
          protocol: 'udp',
          ip: '0.0.0.0',
          announcedAddress: announcedAddress,
          port: config.mediasoup.worker.rtcMinPort
        },
        {
          protocol: 'tcp',
          ip: '0.0.0.0',
          announcedAddress: announcedAddress,
          port: config.mediasoup.worker.rtcMinPort
        }
      ];

      webRtcServer = await mediaSoupWorker.createWebRtcServer({ listenInfos });

      logger.info(
        `WebRTC server created on UDP/TCP:${config.mediasoup.worker.rtcMinPort} (multiplexed mode) with announced address: ${announcedAddress}`
      );
    } catch (error) {
      logger.error('Failed to create WebRTC server', error);
      throw error;
    }
  } else {
    logger.info(
      `Using port range mode: ${config.mediasoup.worker.rtcMinPort}-${config.mediasoup.worker.rtcMaxPort}`
    );
  }

  logger.debug('Mediasoup worker loaded');
};

export { loadMediasoup, mediaSoupWorker, webRtcServer };
