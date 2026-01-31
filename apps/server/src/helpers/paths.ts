import path from 'path';
import {
  IS_DEVELOPMENT,
  IS_TEST,
  SERVER_VERSION,
  SHARKORD_MEDIASOUP_BIN_NAME
} from '../utils/env';
import { getAppDataPath } from './fs';

const DATA_PATH = IS_TEST
  ? path.resolve(process.cwd(), './data-test')
  : IS_DEVELOPMENT
    ? path.resolve(process.cwd(), './data')
    : path.join(getAppDataPath(), 'sharkord');
const DB_PATH = path.join(DATA_PATH, 'db.sqlite');
const LOGS_PATH = path.join(DATA_PATH, 'logs');
const PUBLIC_PATH = path.join(DATA_PATH, 'public');
const TMP_PATH = path.join(DATA_PATH, 'tmp');
const UPLOADS_PATH = path.join(DATA_PATH, 'uploads');
const INTERFACE_PATH = path.resolve(DATA_PATH, 'interface', SERVER_VERSION);
const DRIZZLE_PATH = path.resolve(DATA_PATH, 'drizzle');
const MEDIASOUP_PATH = path.resolve(DATA_PATH, 'mediasoup');
const CONFIG_INI_PATH = path.resolve(DATA_PATH, 'config.ini');
const MEDIASOUP_BINARY_PATH = IS_DEVELOPMENT
  ? undefined
  : path.join(
      MEDIASOUP_PATH,
      SHARKORD_MEDIASOUP_BIN_NAME || 'mediasoup-worker'
    );
const PLUGINS_PATH = path.join(DATA_PATH, 'plugins');
const SRC_MIGRATIONS_PATH = path.join(process.cwd(), 'src', 'db', 'migrations');

export {
  CONFIG_INI_PATH,
  DATA_PATH,
  DB_PATH,
  DRIZZLE_PATH,
  INTERFACE_PATH,
  LOGS_PATH,
  MEDIASOUP_BINARY_PATH,
  MEDIASOUP_PATH,
  PLUGINS_PATH,
  PUBLIC_PATH,
  SRC_MIGRATIONS_PATH,
  TMP_PATH,
  UPLOADS_PATH
};
