import type { WebContents } from 'electron';
import { registerAddServer } from './add-server';
import { registerGetRailVisible } from './get-rail-visible';
import { registerGetState } from './get-state';
import { registerOpenSettings } from './open-settings';
import { registerRemoveServer } from './remove-server';
import { registerSelectServer } from './select-server';
import { registerSetAdding } from './set-adding';
import { registerSetOverlay } from './set-overlay';
import { registerSetRailHidden } from './set-rail-hidden';
import { registerSetSettingsOpen } from './set-settings-open';
import { registerToggleMenuBar } from './toggle-menu-bar';
import { registerTogglePerformanceOverlay } from './toggle-performance-overlay';
import { registerToggleRail } from './toggle-rail';
import type { TIpcContext } from './types';
import { registerUpdateSettings } from './update-settings';

type TRegisterIpcOptions = Omit<TIpcContext, 'isShell'> & {
  shellContents: WebContents;
};

const registerIpc = ({ shellContents, ...rest }: TRegisterIpcOptions) => {
  const context: TIpcContext = {
    ...rest,
    isShell: (sender) => sender === shellContents
  };

  registerGetState(context);
  registerAddServer(context);
  registerSelectServer(context);
  registerRemoveServer(context);
  registerSetAdding(context);
  registerSetOverlay(context);
  registerSetRailHidden(context);
  registerGetRailVisible(context);
  registerToggleRail(context);
  registerSetSettingsOpen(context);
  registerUpdateSettings(context);
  registerOpenSettings(context);
  registerTogglePerformanceOverlay(context);
  registerToggleMenuBar(context);
};

export { registerIpc };
