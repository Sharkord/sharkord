import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import { AdvancedChannel } from '../shared/advanced-channels';
import type { TPerformanceOverlayApi, TProcessUsage } from '../shared/types';

const api: TPerformanceOverlayApi = {
  onUpdate: (listener) => {
    const handler = (_event: IpcRendererEvent, usage: TProcessUsage[]) => {
      listener(usage);
    };

    ipcRenderer.on(AdvancedChannel.METRICS_UPDATED, handler);

    return () => {
      ipcRenderer.removeListener(AdvancedChannel.METRICS_UPDATED, handler);
    };
  }
};

contextBridge.exposeInMainWorld('performanceOverlay', api);
