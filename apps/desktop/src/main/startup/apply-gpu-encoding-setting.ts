import { app } from 'electron';
import { readStore } from '../servers/server-store';

const applyGpuEncodingSetting = (storePath: string) => {
  const { settings } = readStore(storePath);

  if (settings.gpuEncoding) {
    return;
  }

  app.commandLine.appendSwitch('disable-accelerated-video-encode');
};

export { applyGpuEncodingSetting };
