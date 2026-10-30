import { z } from 'zod';
import { IpcChannel } from '../../shared/constants';
import { defineIpc } from './define-ipc';
import { handleIpc } from './handle-ipc';
import type { TIpcContext } from './types';

const toggleMenuBarCall = defineIpc({
  channel: IpcChannel.TOGGLE_MENU_BAR,
  args: z.tuple([]),
  result: z.void()
});

const registerToggleMenuBar = ({ toggleMenuBar, isShell }: TIpcContext) => {
  handleIpc(
    toggleMenuBarCall,
    () => {
      toggleMenuBar();
    },
    isShell
  );
};

export { registerToggleMenuBar, toggleMenuBarCall };
