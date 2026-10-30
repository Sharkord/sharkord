import { bridgeLogger } from '@/helpers/browser-logger';
import {
  getLocalStorageItemAsJSON,
  LocalStorageKey,
  setLocalStorageItemAsJSON
} from '@/helpers/storage';
import { findBindingOwner } from './bindings';
import type {
  THotkeyAction,
  THotkeyBinding,
  THotkeyCapabilities,
  THotkeyHandler,
  THotkeyPhase,
  THotkeySource,
  THotkeySourceEvent,
  THotkeyState,
  THotkeyStatus
} from './types';

const DEFAULT_CAPABILITIES: THotkeyCapabilities = { keyUp: false };
const DEFAULT_ERRORS: Record<string, string> = {};

const isBinding = (value: unknown): value is THotkeyBinding => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const { actionId, combo } = value as Record<string, unknown>;

  return typeof actionId === 'string' && typeof combo === 'string';
};

// mouse buttons were bindable in an earlier version and can no longer fire
const isLegacyMouseCombo = (combo: string) => {
  const parts = combo.split('+');

  return parts.some((part) => part.startsWith('Mouse'));
};

const loadBindings = (): THotkeyBinding[] => {
  const stored = getLocalStorageItemAsJSON<unknown>(
    LocalStorageKey.HOTKEY_BINDINGS,
    []
  );

  if (!Array.isArray(stored)) {
    return [];
  }

  return stored.filter(
    (bind) => isBinding(bind) && !isLegacyMouseCombo(bind.combo)
  );
};

const createHotkeyDispatcher = () => {
  const actions = new Map<string, THotkeyAction>();
  const handlers = new Map<string, Set<THotkeyHandler>>();
  const held = new Set<string>();
  const listeners = new Set<() => void>();

  let source: THotkeySource | undefined;
  let unsubscribeSource: (() => void) | undefined;
  let bindings = loadBindings();
  let status: THotkeyStatus = 'disconnected';
  let capabilities = DEFAULT_CAPABILITIES;
  let errors = DEFAULT_ERRORS;
  let state: THotkeyState;

  const emit = () => {
    state = {
      actions: [...actions.values()],
      bindings,
      status,
      capabilities,
      errors
    };

    listeners.forEach((listener) => listener());
  };

  const syncSource = () => {
    if (!source) {
      return;
    }

    source.setBindings(bindings.filter((bind) => actions.has(bind.actionId)));
  };

  const commit = () => {
    syncSource();
    emit();
  };

  const saveBindings = (next: THotkeyBinding[]) => {
    bindings = next;

    setLocalStorageItemAsJSON(LocalStorageKey.HOTKEY_BINDINGS, bindings);
    commit();
  };

  const callHandlers = (actionId: string, phase: THotkeyPhase) => {
    const set = handlers.get(actionId);

    if (!set) {
      return;
    }

    [...set].forEach((handler) => {
      try {
        // plugin handlers are third party: one throwing must not starve the rest
        handler(phase);
      } catch (error) {
        bridgeLogger.error('a handler failed', error, { actionId });
      }
    });
  };

  const dispatch = (actionId: string, phase: THotkeyPhase) => {
    const action = actions.get(actionId);

    if (!action) {
      bridgeLogger.warn('event for an action that is not registered', {
        actionId,
        phase
      });

      return;
    }

    // without key releases a down never clears, so tracking it would swallow
    // every press after the first
    if (!capabilities.keyUp) {
      if (phase === 'up') {
        return;
      }
    } else if (phase === 'down') {
      if (held.has(actionId)) {
        return;
      }

      held.add(actionId);
    } else if (!held.delete(actionId)) {
      return;
    }

    if (action.mode === 'press' && phase === 'up') {
      return;
    }

    bridgeLogger.info('hotkey', { actionId, phase });
    callHandlers(actionId, phase);
  };

  const releaseHeld = () => {
    const heldIds = [...held];

    held.clear();

    heldIds.forEach((actionId) => {
      const action = actions.get(actionId);

      if (action && action.mode === 'hold') {
        bridgeLogger.info('released a held hotkey', { actionId });
        callHandlers(actionId, 'up');
      }
    });
  };

  const handleSourceEvent = (event: THotkeySourceEvent) => {
    if (event.type === 'hotkey') {
      dispatch(event.actionId, event.phase);

      return;
    }

    if (event.type === 'error') {
      bridgeLogger.warn('the bridge could not bind a hotkey', {
        actionId: event.actionId,
        reason: event.reason
      });

      errors = { ...errors, [event.actionId]: event.reason };
      emit();

      return;
    }

    status = event.status;
    capabilities = event.capabilities;

    if (status === 'connected') {
      errors = DEFAULT_ERRORS;
      syncSource();
    } else {
      releaseHeld();
    }

    emit();
  };

  const setSource = (next: THotkeySource | undefined) => {
    if (unsubscribeSource) {
      unsubscribeSource();
    }

    releaseHeld();

    source = next;
    unsubscribeSource = undefined;
    status = 'disconnected';
    capabilities = DEFAULT_CAPABILITIES;
    errors = DEFAULT_ERRORS;

    bridgeLogger.info(next ? 'source attached' : 'source detached');

    if (next) {
      unsubscribeSource = next.subscribe(handleSourceEvent);
      syncSource();
    }

    emit();
  };

  const registerAction = (action: THotkeyAction, handler: THotkeyHandler) => {
    let set = handlers.get(action.id);

    if (!set) {
      set = new Set();

      handlers.set(action.id, set);
      actions.set(action.id, action);
      bridgeLogger.info('action registered', {
        id: action.id,
        mode: action.mode
      });
      commit();
    }

    set.add(handler);

    return () => {
      const current = handlers.get(action.id);

      if (!current) {
        return;
      }

      current.delete(handler);

      if (current.size > 0) {
        return;
      }

      handlers.delete(action.id);
      actions.delete(action.id);
      held.delete(action.id);
      bridgeLogger.info('action unregistered', { id: action.id });
      commit();
    };
  };

  const setBinding = (actionId: string, combo?: string) => {
    const owner = combo
      ? findBindingOwner(bindings, actionId, combo)
      : undefined;

    if (owner) {
      return owner.actionId;
    }

    const others = bindings.filter((bind) => bind.actionId !== actionId);

    if (errors[actionId]) {
      const { [actionId]: _cleared, ...rest } = errors;

      errors = rest;
    }

    bridgeLogger.info(combo ? 'bind set' : 'bind cleared', { actionId, combo });
    saveBindings(combo ? [...others, { actionId, combo }] : others);

    return undefined;
  };

  const setBindings = (next: THotkeyBinding[]) => {
    errors = DEFAULT_ERRORS;

    bridgeLogger.info('binds saved', { count: next.length });
    saveBindings(next);
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  };

  const reconnect = () => {
    if (source) {
      source.reconnect();
    }
  };

  const getState = () => state;

  emit();

  return {
    getState,
    reconnect,
    registerAction,
    setBinding,
    setBindings,
    setSource,
    subscribe
  };
};

const hotkeys = createHotkeyDispatcher();

export { createHotkeyDispatcher, hotkeys };
