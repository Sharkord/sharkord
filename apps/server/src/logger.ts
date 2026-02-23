import path from 'path';
import { createLogger, format, transports } from 'winston';
import { config } from './config';
import { ensureDir } from './helpers/fs';
import { LOGS_PATH } from './helpers/paths';

const { combine, colorize, printf, errors, splat, timestamp, uncolorize } =
  format;

const fileFormat = combine(
  uncolorize(), // strips any ANSI codes coming from chalk etc.
  splat(),
  errors({ stack: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} ${level.toUpperCase()}: ${stack || message}`;
  })
);

const consoleFormat = combine(
  colorize(),
  splat(),
  errors({ stack: true }),
  printf(({ level, message, stack }) => {
    return `${level}: ${stack || message}`;
  })
);

const combinedLog = path.join(LOGS_PATH, 'combined.log');
const errorLog = path.join(LOGS_PATH, 'error.log');

await ensureDir(LOGS_PATH);

const level = config.server.debug ? 'debug' : 'info';

const logger = createLogger({
  level,
  transports: [
    new transports.Console({
      format: consoleFormat
    }),
    new transports.File({
      filename: combinedLog,
      format: fileFormat,
      level
    }),
    new transports.File({
      filename: errorLog,
      format: fileFormat,
      level: 'error'
    })
  ]
});

export { logger };
