import { z } from 'zod';
import { IpcChannel } from '../../shared/constants';
import { defineIpc } from './define-ipc';
import { handleIpc } from './handle-ipc';
import type { TIpcContext } from './types';

const togglePerformanceOverlayCall = defineIpc({
  channel: IpcChannel.TOGGLE_PERFORMANCE_OVERLAY,
  args: z.tuple([]),
  result: z.void()
});

const registerTogglePerformanceOverlay = ({
  togglePerformanceOverlay,
  isShell
}: TIpcContext) => {
  handleIpc(
    togglePerformanceOverlayCall,
    () => {
      togglePerformanceOverlay();
    },
    isShell
  );
};

export { registerTogglePerformanceOverlay, togglePerformanceOverlayCall };
