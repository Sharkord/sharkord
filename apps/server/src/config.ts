import fs from 'fs/promises';
import { parse, stringify } from 'ini';
import { ensureServerDirs } from './helpers/ensure-server-dirs';
import { getPrivateIp, getPublicIp } from './helpers/network';
import { CONFIG_INI_PATH } from './helpers/paths';
import { IS_DEVELOPMENT } from './utils/env';

const [SERVER_PUBLIC_IP, SERVER_PRIVATE_IP] = await Promise.all([
  getPublicIp(),
  getPrivateIp()
]);

// Helper functions for parsing config values
const parseIntSafe = (value: any, fallback: number): number => {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
};

const parseBoolSafe = (value: any, fallback: boolean = false): boolean => {
  if (value === undefined || value === null || value === '') return fallback;
  return value === 'true' || value === true || value === '1';
};

type TConfig = {
  server: {
    port: number;
    debug: boolean;
    autoupdate: boolean;
  };
  http: {
    maxFiles: number;
    maxFileSize: number;
  };
  mediasoup: {
    worker: {
      rtcMinPort: number;
      rtcMaxPort: number;
      webrtcHost?: string;
    };
  };
};

let config: TConfig = {
  server: {
    port: 4991,
    debug: IS_DEVELOPMENT ? true : false,
    autoupdate: false
  },
  http: {
    maxFiles: 40,
    maxFileSize: 100 // 100 MB
  },
  mediasoup: {
    worker: {
      rtcMinPort: 7882,
      rtcMaxPort: 7882
    }
  }
};

// TODO: get rid of this double write here, but it's fine for now
await ensureServerDirs();

if (!(await fs.exists(CONFIG_INI_PATH))) {
  await fs.writeFile(CONFIG_INI_PATH, stringify(config));
}

const text = await fs.readFile(CONFIG_INI_PATH, {
  encoding: 'utf-8'
});

// Parse ini file (values come back as strings)
const parsedIni = parse(text) as any;

// Apply INI values if they exist (with type conversion and fallbacks)
config.server.port = parseIntSafe(parsedIni.server?.port, config.server.port);
config.server.debug = parseBoolSafe(parsedIni.server?.debug, config.server.debug);
config.server.autoupdate = parseBoolSafe(parsedIni.server?.autoupdate, config.server.autoupdate);
config.http.maxFiles = parseIntSafe(parsedIni.http?.maxFiles, config.http.maxFiles);
config.http.maxFileSize = parseIntSafe(parsedIni.http?.maxFileSize, config.http.maxFileSize);
config.mediasoup.worker.rtcMinPort = parseIntSafe(parsedIni.mediasoup?.worker?.rtcMinPort, config.mediasoup.worker.rtcMinPort);
config.mediasoup.worker.rtcMaxPort = parseIntSafe(parsedIni.mediasoup?.worker?.rtcMaxPort, config.mediasoup.worker.rtcMaxPort);
config.mediasoup.worker.webrtcHost = parsedIni.mediasoup?.worker?.webrtcHost;

// Override with environment variables (SHARKORD_ prefixed to avoid conflicts)
config.server.port = parseIntSafe(process.env.SHARKORD_PORT, config.server.port);
config.server.debug = parseBoolSafe(process.env.SHARKORD_DEBUG, config.server.debug);
config.mediasoup.worker.rtcMinPort = parseIntSafe(process.env.SHARKORD_RTC_MIN_PORT, config.mediasoup.worker.rtcMinPort);
config.mediasoup.worker.rtcMaxPort = parseIntSafe(process.env.SHARKORD_RTC_MAX_PORT, config.mediasoup.worker.rtcMaxPort);
config.mediasoup.worker.webrtcHost = process.env.SHARKORD_WEBRTC_HOST || config.mediasoup.worker.webrtcHost;

config = Object.freeze(config);

export { config, SERVER_PRIVATE_IP, SERVER_PUBLIC_IP };
