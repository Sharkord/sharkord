import { shell } from 'electron';
import { createLogger, getLogsFolder } from './logger';

const logger = createLogger('logs');

const openLogsFolder = async () => {
  const error = await shell.openPath(getLogsFolder());

  if (error) {
    logger.error('failed to open the logs folder', error);
  }
};

export { openLogsFolder };
