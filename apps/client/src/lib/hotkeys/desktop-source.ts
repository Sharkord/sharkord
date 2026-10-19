import { bridgeLogger } from '@/helpers/browser-logger';
import { i18n } from '@/i18n';
import type { TDesktopHotkeyError } from '@sharkord/shared';
import type {
  THotkeyBinding,
  THotkeyCapabilities,
  THotkeySource,
  THotkeySourceEvent
} from './types';

const CAPABILITIES: THotkeyCapabilities = { keyUp: false };

const ERROR_KEYS: Record<TDesktopHotkeyError['reason'], string> = {
  unsupported: 'settings:hotkeyErrorUnsupported',
  taken: 'settings:hotkeyErrorTaken'
};

const createDesktopSource = (): THotkeySource => {
  const listeners = new Set<(event: THotkeySourceEvent) => void>();

  let latestBindings: THotkeyBinding[] = [];
  let unsubscribeHotkeys: (() => void) | undefined;

  const emit = (event: THotkeySourceEvent) => {
    listeners.forEach((listener) => listener(event));
  };

  const register = async (bindings: THotkeyBinding[]) => {
    const desktopApi = window.sharkordDesktop;

    if (!desktopApi) {
      return;
    }

    try {
      const errors = await desktopApi.setHotkeys(bindings);

      errors.forEach(({ actionId, reason }) => {
        emit({ type: 'error', actionId, reason: i18n.t(ERROR_KEYS[reason]) });
      });
    } catch (error) {
      bridgeLogger.error('the desktop app could not register hotkeys', error);
    }
  };

  const start = () => {
    const desktopApi = window.sharkordDesktop;

    if (!desktopApi) {
      emit({ type: 'status', status: 'failed', capabilities: CAPABILITIES });

      return;
    }

    unsubscribeHotkeys = desktopApi.onHotkey((actionId) => {
      emit({ type: 'hotkey', actionId, phase: 'down' });
    });

    emit({ type: 'status', status: 'connected', capabilities: CAPABILITIES });
  };

  const stop = () => {
    if (unsubscribeHotkeys) {
      unsubscribeHotkeys();
      unsubscribeHotkeys = undefined;
    }

    register([]);
  };

  const setBindings = (bindings: THotkeyBinding[]) => {
    latestBindings = bindings;

    register(bindings);
  };

  const reconnect = () => {
    if (listeners.size === 0) {
      return;
    }

    register(latestBindings);
  };

  const subscribe = (listener: (event: THotkeySourceEvent) => void) => {
    listeners.add(listener);

    if (listeners.size === 1) {
      start();
    }

    return () => {
      listeners.delete(listener);

      if (listeners.size === 0) {
        stop();
      }
    };
  };

  return { reconnect, setBindings, subscribe };
};

export { createDesktopSource };
