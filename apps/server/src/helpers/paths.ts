import path from 'path';
import { IS_DEVELOPMENT, SERVER_VERSION } from '../utils/env';
import { getAppDataPath } from './fs';

const DATA_PATH = IS_DEVELOPMENT
  ? path.resolve(process.cwd(), './data')
  : path.join(getAppDataPath(), 'Sharkord');

const DB_PATH = path.join(DATA_PATH, 'db.sqlite');
const LOGS_PATH = path.join(DATA_PATH, 'logs');
const PUBLIC_PATH = path.join(DATA_PATH, 'public');
const TMP_PATH = path.join(DATA_PATH, 'tmp');
const UPLOADS_PATH = path.join(DATA_PATH, 'uploads');
const INTERFACE_PATH = path.resolve(DATA_PATH, './interface', SERVER_VERSION);
const DRIZZLE_PATH = path.resolve(DATA_PATH, 'drizzle');
const CONFIG_INI_PATH = path.resolve(DATA_PATH, 'config.ini');

const SRC_MIGRATIONS_PATH = path.join(process.cwd(), 'src', 'db', 'migrations');

export {
  CONFIG_INI_PATH,
  DB_PATH,
  DRIZZLE_PATH,
  INTERFACE_PATH,
  LOGS_PATH,
  PUBLIC_PATH,
  SRC_MIGRATIONS_PATH,
  TMP_PATH,
  UPLOADS_PATH
};
