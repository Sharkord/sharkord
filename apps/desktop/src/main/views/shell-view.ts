import { WebContentsView } from 'electron';
import path from 'path';

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
    view.webContents.loadURL(devUrl).catch(console.error);
  } else {
    const file = path.join(__dirname, '../renderer/index.html');

    view.webContents.loadFile(file).catch(console.error);
  }

  return view;
};

export { createShellView };
