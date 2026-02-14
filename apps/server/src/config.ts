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
      rtcMinPort: 40000,
      rtcMaxPort: 40020
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

// Parse ini file
config = parse(text) as TConfig;

// Override with environment variables (SHARKORD_ prefixed to avoid conflicts)
if (process.env.SHARKORD_PORT) {
  config.server.port = parseInt(process.env.SHARKORD_PORT, 10);
}

if (process.env.SHARKORD_DEBUG) {
  config.server.debug =
    process.env.SHARKORD_DEBUG === 'true' || process.env.SHARKORD_DEBUG === '1';
}

if (process.env.SHARKORD_RTC_MIN_PORT) {
  config.mediasoup.worker.rtcMinPort = parseInt(
    process.env.SHARKORD_RTC_MIN_PORT,
    10
  );
}

if (process.env.SHARKORD_RTC_MAX_PORT) {
  config.mediasoup.worker.rtcMaxPort = parseInt(
    process.env.SHARKORD_RTC_MAX_PORT,
    10
  );
}

config = Object.freeze(config);

export { config, SERVER_PRIVATE_IP, SERVER_PUBLIC_IP };
