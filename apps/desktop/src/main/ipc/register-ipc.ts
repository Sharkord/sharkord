import type { WebContents } from 'electron';
import { registerAddServer } from './add-server';
import { registerGetRailVisible } from './get-rail-visible';
import { registerGetState } from './get-state';
import { registerRemoveServer } from './remove-server';
import { registerSelectServer } from './select-server';
import { registerSetAdding } from './set-adding';
import { registerSetOverlay } from './set-overlay';
import { registerSetRailHidden } from './set-rail-hidden';
import { registerToggleRail } from './toggle-rail';
import type { TIpcContext } from './types';

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
};

export { registerIpc };
