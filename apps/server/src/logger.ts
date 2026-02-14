import path from 'path';
import { createLogger, format, transports } from 'winston';
import { config } from './config';
import { ensureDir } from './helpers/fs';
import { LOGS_PATH } from './helpers/paths';

const { combine, colorize, printf, errors, splat } = format;

const logFormat = printf(({ level, message, stack }) => {
  return `${level}: ${stack || message}`;
});

const appLog = path.join(LOGS_PATH, 'app.log');
const errorLog = path.join(LOGS_PATH, 'error.log');

await ensureDir(LOGS_PATH);

const level = config.server.debug ? 'debug' : 'info';

const logger = createLogger({
  level,
  format: combine(colorize(), splat(), errors({ stack: true }), logFormat),
  transports: [
    new transports.Console(),
    new transports.File({
      filename: appLog,
      level
    }),
    new transports.File({
      filename: errorLog,
      level: 'error'
    })
  ]
});

export { logger };
