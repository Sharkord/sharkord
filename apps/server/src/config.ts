import { parse, stringify } from 'ini';
import fs from 'node:fs/promises';
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
    webRtcServerPort: number;
    announcedAddress: string;
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
    },
    webRtcServerPort: 40000,
    announcedAddress: ''
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

if (process.env.DEBUG) {
  config.server.debug = true;
}

config = Object.freeze(parse(text) as TConfig);

export { config, SERVER_PRIVATE_IP, SERVER_PUBLIC_IP };
