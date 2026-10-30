import type { TPluginHotkeyMode, TPluginHotkeyPhase } from '@sharkord/shared';

// the same two sets plugins see, so the client and the SDK cannot drift
type THotkeyPhase = TPluginHotkeyPhase;

type THotkeyMode = TPluginHotkeyMode;

type THotkeyStatus = 'disconnected' | 'connecting' | 'connected' | 'failed';

type THotkeyCapabilities = {
  keyUp: boolean;
};

type THotkeyAction = {
  id: string;
  label: string;
  mode: THotkeyMode;
};

type THotkeyBinding = {
  actionId: string;
  combo: string;
};

type THotkeyHandler = (phase: THotkeyPhase) => void;

type THotkeySourceEvent =
  | { type: 'hotkey'; actionId: string; phase: THotkeyPhase }
  | {
      type: 'status';
      status: THotkeyStatus;
      capabilities: THotkeyCapabilities;
    }
  | { type: 'error'; actionId: string; reason: string };

type THotkeySource = {
  reconnect: () => void;
  setBindings: (bindings: THotkeyBinding[]) => void;
  subscribe: (listener: (event: THotkeySourceEvent) => void) => () => void;
};

type THotkeyState = {
  actions: THotkeyAction[];
  bindings: THotkeyBinding[];
  status: THotkeyStatus;
  capabilities: THotkeyCapabilities;
  errors: Record<string, string>;
};

export type {
  THotkeyAction,
  THotkeyBinding,
  THotkeyCapabilities,
  THotkeyHandler,
  THotkeyMode,
  THotkeyPhase,
  THotkeySource,
  THotkeySourceEvent,
  THotkeyState,
  THotkeyStatus
};
