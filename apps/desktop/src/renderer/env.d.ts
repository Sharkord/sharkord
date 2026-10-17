import type { TDesktopApi, TPerformanceOverlayApi } from '../shared/types';

declare global {
  interface Window {
    desktop: TDesktopApi;
    performanceOverlay: TPerformanceOverlayApi;
  }
}
