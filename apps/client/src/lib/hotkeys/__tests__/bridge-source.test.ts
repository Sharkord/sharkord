import { LocalStorageKey, setLocalStorageItem } from '@/helpers/storage';
import { CoreHotkeyAction } from '@/lib/hotkeys/actions';
import { createBridgeSource } from '@/lib/hotkeys/bridge-source';
import type { THotkeySourceEvent } from '@/lib/hotkeys/types';
import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test';
import { installFakeLocalStorage } from './helpers';

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];

  sent: Record<string, unknown>[] = [];
  closed = false;
  onopen?: () => void;
  onmessage?: (event: { data: string }) => void;
  onclose?: () => void;

  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(JSON.parse(data));
  }

  close() {
    this.closed = true;

    if (this.onclose) {
      this.onclose();
    }
  }

  open() {
    if (this.onopen) {
      this.onopen();
    }
  }

  receive(message: unknown) {
    if (this.onmessage) {
      this.onmessage({
        data: typeof message === 'string' ? message : JSON.stringify(message)
      });
    }
  }
}

const IDENTITY = { serverId: 'srv-1', serverName: 'My Guild' };
const originalWebSocket = globalThis.WebSocket;

let restoreStorage: () => void;
let timers: (() => void)[];

const lastSocket = () =>
  FakeWebSocket.instances[FakeWebSocket.instances.length - 1];

const connectSource = () => {
  const source = createBridgeSource(IDENTITY);
  const events: THotkeySourceEvent[] = [];
  const unsubscribe = source.subscribe((event) => events.push(event));

  return { source, events, unsubscribe };
};

beforeEach(() => {
  restoreStorage = installFakeLocalStorage();
  FakeWebSocket.instances = [];
  timers = [];

  Object.defineProperty(globalThis, 'WebSocket', {
    configurable: true,
    writable: true,
    value: FakeWebSocket
  });

  spyOn(globalThis, 'setTimeout').mockImplementation(((
    callback: () => void
  ) => {
    timers.push(callback);

    return 0;
  }) as unknown as typeof setTimeout);

  setLocalStorageItem(LocalStorageKey.HOTKEY_BRIDGE_TOKEN, 'secret');
});

afterEach(() => {
  restoreStorage();

  Object.defineProperty(globalThis, 'WebSocket', {
    configurable: true,
    writable: true,
    value: originalWebSocket
  });
});

describe('bridge source', () => {
  it('says hello with the token and the server identity', () => {
    const { events } = connectSource();

    lastSocket().open();

    expect(lastSocket().sent).toEqual([
      {
        type: 'hello',
        v: 1,
        token: 'secret',
        serverId: 'srv-1',
        serverName: 'My Guild'
      }
    ]);
    expect(events).toEqual([
      {
        type: 'status',
        status: 'connecting',
        capabilities: { keyUp: false }
      }
    ]);
  });

  it('does not touch the network without a token, and tries once one is saved', () => {
    setLocalStorageItem(LocalStorageKey.HOTKEY_BRIDGE_TOKEN, '');

    const { source, events } = connectSource();

    expect(FakeWebSocket.instances).toHaveLength(0);
    expect(timers).toHaveLength(0);
    expect(events[events.length - 1]).toMatchObject({ status: 'failed' });

    setLocalStorageItem(LocalStorageKey.HOTKEY_BRIDGE_TOKEN, 'secret');
    source.reconnect();

    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(events[events.length - 1]).toMatchObject({ status: 'connecting' });
  });

  it('turns ready into a connected status with capabilities', () => {
    const { events } = connectSource();

    lastSocket().receive({
      type: 'ready',
      v: 1,
      capabilities: { keyUp: true }
    });

    expect(events[events.length - 1]).toEqual({
      type: 'status',
      status: 'connected',
      capabilities: { keyUp: true }
    });
  });

  it('sends the latest binds only once ready, as ids and combos', () => {
    const { source } = connectSource();

    source.setBindings([
      { actionId: CoreHotkeyAction.TOGGLE_MIC, combo: 'ctrl+KeyM' }
    ]);
    lastSocket().open();

    expect(lastSocket().sent).toHaveLength(1);

    lastSocket().receive({ type: 'ready', v: 1, capabilities: {} });
    source.setBindings([
      { actionId: CoreHotkeyAction.TOGGLE_MIC, combo: 'F8' }
    ]);

    expect(lastSocket().sent[1]).toEqual({
      type: 'bindings',
      bindings: [{ id: CoreHotkeyAction.TOGGLE_MIC, combo: 'F8' }]
    });
  });

  it('forwards events and errors and ignores malformed messages', () => {
    const { events } = connectSource();
    const before = events.length;

    lastSocket().receive({ type: 'event', id: 'a', phase: 'down' });
    lastSocket().receive({ type: 'error', id: 'a', reason: 'in use' });
    lastSocket().receive({ type: 'event', id: 'a', phase: 'sideways' });
    lastSocket().receive({ type: 'event', phase: 'down' });
    lastSocket().receive('not json');
    lastSocket().receive({ type: 'mystery' });

    expect(events.slice(before)).toEqual([
      { type: 'hotkey', actionId: 'a', phase: 'down' },
      { type: 'error', actionId: 'a', reason: 'in use' }
    ]);
  });

  it('reconnects with backoff after the socket closes', () => {
    const { events } = connectSource();

    lastSocket().close();

    expect(events[events.length - 1]).toMatchObject({ status: 'disconnected' });
    expect(timers).toHaveLength(1);

    timers[0]();

    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it('gives up after ten failed attempts and goes quiet', () => {
    const { events } = connectSource();

    for (let attempt = 1; attempt < 10; attempt++) {
      lastSocket().close();
      timers.shift()?.();
    }

    expect(FakeWebSocket.instances).toHaveLength(10);

    lastSocket().close();

    expect(events[events.length - 1]).toMatchObject({ status: 'failed' });
    expect(timers).toHaveLength(0);
    expect(FakeWebSocket.instances).toHaveLength(10);
  });

  it('starts a fresh run of attempts when asked to reconnect', () => {
    const { source, events } = connectSource();

    for (let attempt = 1; attempt < 10; attempt++) {
      lastSocket().close();
      timers.shift()?.();
    }

    lastSocket().close();
    source.reconnect();

    expect(events[events.length - 1]).toMatchObject({ status: 'connecting' });
    expect(FakeWebSocket.instances).toHaveLength(11);

    lastSocket().close();

    expect(timers).toHaveLength(1);
  });

  it('counts attempts again from zero once the bridge was reached', () => {
    const { events } = connectSource();

    for (let attempt = 1; attempt < 10; attempt++) {
      lastSocket().close();
      timers.shift()?.();
    }

    lastSocket().receive({ type: 'ready', v: 1, capabilities: {} });
    lastSocket().close();

    expect(events[events.length - 1]).toMatchObject({ status: 'disconnected' });
    expect(timers).toHaveLength(1);
  });

  it('ignores a reconnect while it is already connected', () => {
    const { source } = connectSource();

    lastSocket().receive({ type: 'ready', v: 1, capabilities: {} });
    source.reconnect();

    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it('reconnects while connected when the pairing token changed', () => {
    const { source } = connectSource();
    const first = lastSocket();

    first.receive({ type: 'ready', v: 1, capabilities: {} });
    setLocalStorageItem(LocalStorageKey.HOTKEY_BRIDGE_TOKEN, 'new-token');
    source.reconnect();

    expect(first.closed).toBe(true);
    expect(FakeWebSocket.instances).toHaveLength(2);

    lastSocket().open();

    expect(lastSocket().sent[0]).toMatchObject({ token: 'new-token' });
  });

  it('stops for good when another tab replaces it', () => {
    connectSource();

    lastSocket().receive({ type: 'replaced' });

    expect(lastSocket().closed).toBe(true);
    expect(timers).toHaveLength(0);
  });

  it('closes the socket and stops retrying when the last listener leaves', () => {
    const { unsubscribe } = connectSource();
    const socket = lastSocket();

    unsubscribe();

    expect(socket.closed).toBe(true);
    expect(timers).toHaveLength(0);
  });
});
