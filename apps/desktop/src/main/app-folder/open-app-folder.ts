import { app, shell } from 'electron';
import { createLogger } from '../logs/logger';

const logger = createLogger('app-folder');

const getAppFolder = () => app.getPath('userData');

const openAppFolder = async () => {
  const error = await shell.openPath(getAppFolder());

  if (error) {
    logger.error('failed to open the app folder', error);
  }
};

export { getAppFolder, openAppFolder };
