import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import { DevChannel } from '../shared/dev-channels';
import type { TPerformanceOverlayApi, TProcessUsage } from '../shared/types';

const api: TPerformanceOverlayApi = {
  onUpdate: (listener) => {
    const handler = (_event: IpcRendererEvent, usage: TProcessUsage[]) => {
      listener(usage);
    };

    ipcRenderer.on(DevChannel.METRICS_UPDATED, handler);

    return () => {
      ipcRenderer.removeListener(DevChannel.METRICS_UPDATED, handler);
    };
  }
};

contextBridge.exposeInMainWorld('performanceOverlay', api);
