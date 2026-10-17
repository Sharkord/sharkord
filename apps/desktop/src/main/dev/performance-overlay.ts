import { app, BrowserWindow } from 'electron';
import path from 'path';
import { DevChannel } from '../../shared/dev-channels';
import { summarizeMetrics } from './summarize-metrics';

const OVERLAY_WIDTH = 280;
const OVERLAY_HEIGHT = 210;
const OVERLAY_MARGIN = 16;
const REFRESH_MS = 1000;

const loadOverlay = (overlay: BrowserWindow) => {
  const devUrl = process.env.ELECTRON_RENDERER_URL;

  if (devUrl) {
    overlay.loadURL(`${devUrl}/performance.html`).catch(console.error);

    return;
  }

  const file = path.join(__dirname, '../renderer/performance.html');

  overlay.loadFile(file).catch(console.error);
};

const createPerformanceOverlay = (parent: BrowserWindow) => {
  let overlay: BrowserWindow | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;

  const publish = () => {
    if (!overlay) {
      return;
    }

    const usage = summarizeMetrics(app.getAppMetrics());

    overlay.webContents.send(DevChannel.METRICS_UPDATED, usage);
  };

  const open = () => {
    const [parentX, parentY] = parent.getPosition();
    const [parentWidth] = parent.getSize();

    overlay = new BrowserWindow({
      parent,
      x: parentX + parentWidth - OVERLAY_WIDTH - OVERLAY_MARGIN,
      y: parentY + OVERLAY_MARGIN,
      width: OVERLAY_WIDTH,
      height: OVERLAY_HEIGHT,
      frame: false,
      resizable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      backgroundColor: '#0a0a0a',
      webPreferences: {
        preload: path.join(__dirname, '../preload/performance.js'),
        sandbox: true,
        contextIsolation: true
      }
    });

    overlay.webContents.on('did-finish-load', publish);

    overlay.on('closed', () => {
      if (timer) {
        clearInterval(timer);
      }

      timer = null;
      overlay = null;
    });

    timer = setInterval(publish, REFRESH_MS);
    loadOverlay(overlay);
  };

  const toggle = () => {
    if (overlay) {
      overlay.close();

      return;
    }

    open();
  };

  return { toggle };
};

export { createPerformanceOverlay };
