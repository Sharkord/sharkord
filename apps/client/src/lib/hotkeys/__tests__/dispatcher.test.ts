import { CoreHotkeyAction } from '@/lib/hotkeys/actions';
import { createHotkeyDispatcher } from '@/lib/hotkeys/dispatcher';
import type {
  THotkeyBinding,
  THotkeyPhase,
  THotkeySource,
  THotkeySourceEvent
} from '@/lib/hotkeys/types';
import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test';
import { installFakeLocalStorage } from './helpers';

const createFakeSource = () => {
  let listener: ((event: THotkeySourceEvent) => void) | undefined;
  const sent: THotkeyBinding[][] = [];
  let reconnects = 0;

  const source: THotkeySource = {
    reconnect: () => {
      reconnects += 1;
    },
    setBindings: (bindings) => {
      sent.push(bindings);
    },
    subscribe: (next) => {
      listener = next;

      return () => {
        listener = undefined;
      };
    }
  };

  const emit = (event: THotkeySourceEvent) => {
    if (listener) {
      listener(event);
    }
  };

  const press = (actionId: string, phase: THotkeyPhase) =>
    emit({ type: 'hotkey', actionId, phase });

  const connect = (keyUp = true) =>
    emit({
      type: 'status',
      status: 'connected',
      capabilities: { keyUp }
    });

  const disconnect = () =>
    emit({
      type: 'status',
      status: 'disconnected',
      capabilities: { keyUp: false }
    });

  const lastSent = () => sent[sent.length - 1];

  const reconnectCount = () => reconnects;

  return {
    source,
    press,
    connect,
    disconnect,
    lastSent,
    emit,
    reconnectCount
  };
};

const MUTE = {
  id: CoreHotkeyAction.TOGGLE_MIC,
  label: 'Toggle mic',
  mode: 'press'
} as const;

const PTT = {
  id: CoreHotkeyAction.PUSH_TO_TALK,
  label: 'Push to talk',
  mode: 'hold'
} as const;

let restoreStorage: () => void;

beforeEach(() => {
  restoreStorage = installFakeLocalStorage();
});

afterEach(() => {
  restoreStorage();
});

describe('hotkey dispatcher', () => {
  it('fires press actions on down only and ignores auto repeat', () => {
    const dispatcher = createHotkeyDispatcher();
    const fake = createFakeSource();
    const calls: THotkeyPhase[] = [];

    dispatcher.registerAction(MUTE, (phase) => calls.push(phase));
    dispatcher.setSource(fake.source);
    fake.connect();

    fake.press(MUTE.id, 'down');
    fake.press(MUTE.id, 'down');
    fake.press(MUTE.id, 'up');
    fake.press(MUTE.id, 'down');

    expect(calls).toEqual(['down', 'down']);
  });

  it('fires every press when the source cannot report releases', () => {
    const dispatcher = createHotkeyDispatcher();
    const fake = createFakeSource();
    const calls: THotkeyPhase[] = [];

    dispatcher.registerAction(MUTE, (phase) => calls.push(phase));
    dispatcher.setSource(fake.source);
    fake.connect(false);

    fake.press(MUTE.id, 'down');
    fake.press(MUTE.id, 'down');
    fake.press(MUTE.id, 'up');

    expect(calls).toEqual(['down', 'down']);
  });

  it('forwards both phases for hold actions and drops a stray up', () => {
    const dispatcher = createHotkeyDispatcher();
    const fake = createFakeSource();
    const calls: THotkeyPhase[] = [];

    dispatcher.registerAction(PTT, (phase) => calls.push(phase));
    dispatcher.setSource(fake.source);
    fake.connect();

    fake.press(PTT.id, 'up');
    fake.press(PTT.id, 'down');
    fake.press(PTT.id, 'up');

    expect(calls).toEqual(['down', 'up']);
  });

  it('calls every handler even when one throws', () => {
    const dispatcher = createHotkeyDispatcher();
    const fake = createFakeSource();
    const errorSpy = spyOn(console, 'error').mockImplementation(() => {});
    let second = 0;

    dispatcher.registerAction(MUTE, () => {
      throw new Error('boom');
    });
    dispatcher.registerAction(MUTE, () => {
      second++;
    });
    dispatcher.setSource(fake.source);
    fake.connect();

    fake.press(MUTE.id, 'down');

    expect(second).toBe(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it('removes the action once its last handler unregisters', () => {
    const dispatcher = createHotkeyDispatcher();
    const fake = createFakeSource();
    let calls = 0;

    const unregisterA = dispatcher.registerAction(MUTE, () => calls++);
    const unregisterB = dispatcher.registerAction(MUTE, () => calls++);

    dispatcher.setSource(fake.source);
    unregisterA();

    expect(dispatcher.getState().actions).toEqual([MUTE]);

    unregisterB();
    fake.press(MUTE.id, 'down');

    expect(dispatcher.getState().actions).toEqual([]);
    expect(calls).toBe(0);
  });

  it('persists binds and refuses a combo owned by another action', () => {
    const dispatcher = createHotkeyDispatcher();

    dispatcher.registerAction(MUTE, () => {});
    dispatcher.registerAction(PTT, () => {});

    expect(dispatcher.setBinding(MUTE.id, 'ctrl+KeyM')).toBeUndefined();
    expect(dispatcher.setBinding(PTT.id, 'ctrl+KeyM')).toBe(MUTE.id);
    expect(dispatcher.setBinding(MUTE.id, 'ctrl+KeyM')).toBeUndefined();

    const reloaded = createHotkeyDispatcher();

    expect(reloaded.getState().bindings).toEqual([
      { actionId: MUTE.id, combo: 'ctrl+KeyM' }
    ]);

    dispatcher.setBinding(MUTE.id);

    expect(dispatcher.getState().bindings).toEqual([]);
  });

  it('refuses a combo bound to an action that is not registered right now', () => {
    const dispatcher = createHotkeyDispatcher();

    dispatcher.setBinding(PTT.id, 'F13');
    dispatcher.registerAction(MUTE, () => {});

    expect(dispatcher.setBinding(MUTE.id, 'F13')).toBe(PTT.id);
    expect(dispatcher.getState().bindings).toEqual([
      { actionId: PTT.id, combo: 'F13' }
    ]);
  });

  it('only hands binds of registered actions to the source', () => {
    const dispatcher = createHotkeyDispatcher();
    const fake = createFakeSource();

    dispatcher.setBinding('plugin:gone', 'F8');
    dispatcher.setBinding(MUTE.id, 'ctrl+KeyM');
    dispatcher.setSource(fake.source);

    expect(fake.lastSent()).toEqual([]);

    const unregister = dispatcher.registerAction(MUTE, () => {});

    expect(fake.lastSent()).toEqual([
      { actionId: MUTE.id, combo: 'ctrl+KeyM' }
    ]);

    unregister();

    expect(fake.lastSent()).toEqual([]);
  });

  it('resends binds when the source connects and exposes its state', () => {
    const dispatcher = createHotkeyDispatcher();
    const fake = createFakeSource();

    dispatcher.registerAction(MUTE, () => {});
    dispatcher.setBinding(MUTE.id, 'ctrl+KeyM');
    dispatcher.setSource(fake.source);
    fake.connect(false);

    expect(fake.lastSent()).toEqual([
      { actionId: MUTE.id, combo: 'ctrl+KeyM' }
    ]);
    expect(dispatcher.getState().status).toBe('connected');
    expect(dispatcher.getState().capabilities).toEqual({
      keyUp: false
    });
  });

  it('releases held hold actions when the source disconnects', () => {
    const dispatcher = createHotkeyDispatcher();
    const fake = createFakeSource();
    const calls: THotkeyPhase[] = [];

    dispatcher.registerAction(PTT, (phase) => calls.push(phase));
    dispatcher.setSource(fake.source);
    fake.connect();
    fake.press(PTT.id, 'down');
    fake.disconnect();

    expect(calls).toEqual(['down', 'up']);
  });

  it('releases held hold actions when the source is swapped out', () => {
    const dispatcher = createHotkeyDispatcher();
    const fake = createFakeSource();
    const calls: THotkeyPhase[] = [];

    dispatcher.registerAction(PTT, (phase) => calls.push(phase));
    dispatcher.setSource(fake.source);
    fake.connect();
    fake.press(PTT.id, 'down');
    dispatcher.setSource(undefined);

    expect(calls).toEqual(['down', 'up']);
    expect(dispatcher.getState().status).toBe('disconnected');
  });

  it('keeps source errors per action until the bind changes', () => {
    const dispatcher = createHotkeyDispatcher();
    const fake = createFakeSource();

    dispatcher.registerAction(MUTE, () => {});
    dispatcher.setSource(fake.source);
    fake.emit({ type: 'error', actionId: MUTE.id, reason: 'combo in use' });

    expect(dispatcher.getState().errors).toEqual({ [MUTE.id]: 'combo in use' });

    dispatcher.setBinding(MUTE.id, 'ctrl+KeyN');

    expect(dispatcher.getState().errors).toEqual({});
  });

  it('notifies subscribers with a new state snapshot on change', () => {
    const dispatcher = createHotkeyDispatcher();
    const before = dispatcher.getState();
    let notified = 0;

    dispatcher.subscribe(() => notified++);
    dispatcher.registerAction(MUTE, () => {});

    expect(notified).toBe(1);
    expect(dispatcher.getState()).not.toBe(before);
  });

  it('replaces every bind at once and persists them', () => {
    const dispatcher = createHotkeyDispatcher();
    const fake = createFakeSource();

    dispatcher.registerAction(MUTE, () => {});
    dispatcher.setSource(fake.source);
    dispatcher.setBinding(PTT.id, 'KeyV');
    dispatcher.setBindings([
      { actionId: MUTE.id, combo: 'ctrl+KeyM' },
      { actionId: 'plugin:gone', combo: 'F8' }
    ]);

    expect(dispatcher.getState().bindings).toEqual([
      { actionId: MUTE.id, combo: 'ctrl+KeyM' },
      { actionId: 'plugin:gone', combo: 'F8' }
    ]);
    expect(fake.lastSent()).toEqual([
      { actionId: MUTE.id, combo: 'ctrl+KeyM' }
    ]);
    expect(createHotkeyDispatcher().getState().bindings).toHaveLength(2);
  });

  it('drops mouse binds saved by an earlier version', () => {
    localStorage.setItem(
      'sharkord-hotkey-bindings',
      JSON.stringify([
        { actionId: MUTE.id, combo: 'ctrl+Mouse4' },
        { actionId: PTT.id, combo: 'KeyV' }
      ])
    );

    expect(createHotkeyDispatcher().getState().bindings).toEqual([
      { actionId: PTT.id, combo: 'KeyV' }
    ]);
  });

  it('asks the source to try again, and does nothing without one', () => {
    const dispatcher = createHotkeyDispatcher();
    const fake = createFakeSource();

    expect(() => dispatcher.reconnect()).not.toThrow();

    dispatcher.setSource(fake.source);
    dispatcher.reconnect();

    expect(fake.reconnectCount()).toBe(1);
  });
});
