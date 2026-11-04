import { app } from 'electron';
import log from 'electron-log/main';
import os from 'os';
import path from 'path';

// a long session still holds its start, older lines rotate into main.old.log
const MAX_LOG_SIZE = 5 * 1024 * 1024;

// inside the app folder on every platform, macos would otherwise put it in ~/Library/Logs
const getLogsFolder = () => path.join(app.getPath('userData'), 'logs');

const createLogger = (scope: string) => log.scope(scope);

const logEnvironment = () => {
  const logger = createLogger('app');

  logger.info('starting', {
    version: app.getVersion(),
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    platform: process.platform,
    arch: process.arch,
    os: os.release(),
    packaged: app.isPackaged,
    sessionType: process.env.XDG_SESSION_TYPE,
    desktop: process.env.XDG_CURRENT_DESKTOP
  });
};

const initLogger = () => {
  log.transports.file.resolvePathFn = () =>
    path.join(getLogsFolder(), 'main.log');
  log.transports.file.maxSize = MAX_LOG_SIZE;

  log.errorHandler.startCatching();

  // not electron-log's event logger, it writes the page address of every event into the file
  const logger = createLogger('app');

  app.on('child-process-gone', (_event, { type, name, reason, exitCode }) => {
    logger.error('child process gone', { type, name, reason, exitCode });
  });

  app.on('certificate-error', (_event, _contents, _url, error) => {
    logger.warn('certificate error', { error });
  });

  logEnvironment();
};

export { createLogger, getLogsFolder, initLogger };
