import { WebContentsView } from 'electron';
import path from 'path';
import { createLogger } from '../logs/logger';
import { getShellUrl } from '../startup/shell-protocol';

const logger = createLogger('shell');

const createShellView = () => {
  const view = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  view.setBackgroundColor('#00000000'); // see through wherever the shell has nothing to draw, so a menu can float over a server

  const devUrl = process.env.ELECTRON_RENDERER_URL;

  if (devUrl) {
    view.webContents.loadURL(devUrl).catch((error) => {
      logger.error('failed to load the shell', error);
    });
  } else {
    view.webContents.loadURL(getShellUrl('index.html')).catch((error) => {
      logger.error('failed to load the shell', error);
    });
  }

  return view;
};

export { createShellView };
