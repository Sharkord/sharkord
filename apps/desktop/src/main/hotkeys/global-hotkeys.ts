import type {
  TDesktopHotkeyBinding,
  TDesktopHotkeyError
} from '@sharkord/shared';
import { globalShortcut } from 'electron';
import { comboToAccelerator } from './combo-to-accelerator';

type TServerHotkeys = {
  bindings: (TDesktopHotkeyBinding & { accelerator: string | undefined })[];
  onPress: (actionId: string) => void;
};

const servers = new Map<string, TServerHotkeys>();
const registered = new Set<string>();

// only the server selected in the rail holds its keys, the others leave them free for other apps
let activeServerId: string | null = null;

const press = (accelerator: string) => {
  const active = activeServerId ? servers.get(activeServerId) : undefined;

  if (!active) {
    return;
  }

  for (const binding of active.bindings) {
    if (binding.accelerator === accelerator) {
      active.onPress(binding.actionId);
    }
  }
};

const sync = () => {
  const wanted = new Set<string>();
  const active = activeServerId ? servers.get(activeServerId) : undefined;

  for (const { accelerator } of active ? active.bindings : []) {
    if (accelerator) {
      wanted.add(accelerator);
    }
  }

  for (const accelerator of registered) {
    if (!wanted.has(accelerator)) {
      globalShortcut.unregister(accelerator);
      registered.delete(accelerator);
    }
  }

  for (const accelerator of wanted) {
    if (registered.has(accelerator)) {
      continue;
    }

    try {
      if (globalShortcut.register(accelerator, () => press(accelerator))) {
        registered.add(accelerator);
      }
    } catch (error) {
      console.error('failed to register a hotkey', accelerator, error);
    }
  }
};

const setServerHotkeys = (
  serverId: string,
  bindings: TDesktopHotkeyBinding[],
  onPress: (actionId: string) => void
): TDesktopHotkeyError[] => {
  const withAccelerators = bindings.map((binding) => ({
    ...binding,
    accelerator: comboToAccelerator(binding.combo)
  }));

  servers.set(serverId, { bindings: withAccelerators, onPress });
  sync();

  return withAccelerators.flatMap(
    ({ actionId, accelerator }): TDesktopHotkeyError[] => {
      if (!accelerator) {
        return [{ actionId, reason: 'unsupported' }];
      }

      // a server in the background holds no keys, so nothing can be taken from it yet
      if (serverId === activeServerId && !registered.has(accelerator)) {
        return [{ actionId, reason: 'taken' }];
      }

      return [];
    }
  );
};

const clearServerHotkeys = (serverId: string) => {
  if (!servers.delete(serverId)) {
    return;
  }

  sync();
};

const setActiveHotkeyServer = (serverId: string | null) => {
  if (serverId === activeServerId) {
    return;
  }

  activeServerId = serverId;

  sync();
};

export { clearServerHotkeys, setActiveHotkeyServer, setServerHotkeys };
