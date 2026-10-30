import { desktopLogger } from '@/helpers/browser-logger';
import { getDesktopApi } from '@/helpers/desktop-api';
import { i18n } from '@/i18n';
import type { TDesktopHotkeyError } from '@sharkord/shared';
import type {
  THotkeyBinding,
  THotkeyCapabilities,
  THotkeySource,
  THotkeySourceEvent
} from './types';

const NO_CAPABILITIES: THotkeyCapabilities = {
  keyUp: false,
  systemManaged: false
};

const ERROR_KEYS: Record<TDesktopHotkeyError['reason'], string> = {
  unsupported: 'settings:hotkeyErrorUnsupported',
  'needs-modifier': 'settings:hotkeyErrorNeedsModifier',
  taken: 'settings:hotkeyErrorTaken',
  declined: 'settings:hotkeyErrorDeclined'
};

const createDesktopSource = (): THotkeySource => {
  const listeners = new Set<(event: THotkeySourceEvent) => void>();

  let latestBindings: THotkeyBinding[] = [];
  let unsubscribeHotkeys: (() => void) | undefined;
  let unsubscribeErrors: (() => void) | undefined;
  let inactiveActionIds = new Set<string>();

  const emit = (event: THotkeySourceEvent) => {
    listeners.forEach((listener) => listener(event));
  };

  const emitErrors = (errors: TDesktopHotkeyError[]) => {
    errors.forEach(({ actionId, reason }) => {
      emit({ type: 'error', actionId, reason: i18n.t(ERROR_KEYS[reason]) });
    });
  };

  const handleInactive = (errors: TDesktopHotkeyError[]) => {
    const next = new Set(errors.map(({ actionId }) => actionId));

    inactiveActionIds.forEach((actionId) => {
      if (!next.has(actionId)) {
        emit({ type: 'error-cleared', actionId });
      }
    });

    inactiveActionIds = next;
    emitErrors(errors);
  };

  const register = async (bindings: THotkeyBinding[]) => {
    const desktopApi = getDesktopApi();

    if (!desktopApi) {
      return;
    }

    try {
      const errors = await desktopApi.setHotkeys(bindings);

      emitErrors(errors);
    } catch (error) {
      desktopLogger.error('the desktop app could not register hotkeys', error);
    }
  };

  const start = async () => {
    const desktopApi = getDesktopApi();

    if (!desktopApi) {
      emit({ type: 'status', status: 'failed', capabilities: NO_CAPABILITIES });

      return;
    }

    unsubscribeHotkeys = desktopApi.onHotkey((actionId, phase) => {
      emit({ type: 'hotkey', actionId, phase });
    });

    unsubscribeErrors = desktopApi.onHotkeyErrors(handleInactive);

    let capabilities = NO_CAPABILITIES;

    try {
      capabilities = await desktopApi.getHotkeyCapabilities();
    } catch (error) {
      desktopLogger.error('could not read the hotkey capabilities', error);
    }

    if (listeners.size === 0) {
      return;
    }

    emit({ type: 'status', status: 'connected', capabilities });
  };

  const stop = () => {
    if (unsubscribeHotkeys) {
      unsubscribeHotkeys();
      unsubscribeHotkeys = undefined;
    }

    if (unsubscribeErrors) {
      unsubscribeErrors();
      unsubscribeErrors = undefined;
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
