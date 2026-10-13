import { bridgeLogger } from '@/helpers/browser-logger';
import { getLocalStorageItem, LocalStorageKey } from '@/helpers/storage';
import type {
  THotkeyBinding,
  THotkeyCapabilities,
  THotkeySource,
  THotkeySourceEvent,
  THotkeyStatus
} from './types';

const BRIDGE_URL = 'ws://127.0.0.1:47821';
const PROTOCOL_VERSION = 1;
const MIN_RETRY_MS = 1000;
const MAX_RETRY_MS = 10000;
const MAX_ATTEMPTS = 10;
const NO_CAPABILITIES: THotkeyCapabilities = { keyUp: false };

type TBridgeIdentity = {
  serverId: string;
  serverName: string;
};

type TBridgeMessage = THotkeySourceEvent | { type: 'replaced' };

const parseCapabilities = (value: unknown): THotkeyCapabilities => {
  if (typeof value !== 'object' || value === null) {
    return NO_CAPABILITIES;
  }

  const { keyUp } = value as Record<string, unknown>;

  return { keyUp: keyUp === true };
};

// the bridge is a separate process we do not control, so every field is checked
const parseMessage = (raw: string): TBridgeMessage | undefined => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return undefined;
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return undefined;
  }

  const message = parsed as Record<string, unknown>;

  if (message.type === 'ready') {
    return {
      type: 'status',
      status: 'connected',
      capabilities: parseCapabilities(message.capabilities)
    };
  }

  if (message.type === 'replaced') {
    return { type: 'replaced' };
  }

  if (typeof message.id !== 'string') {
    return undefined;
  }

  if (
    message.type === 'event' &&
    (message.phase === 'down' || message.phase === 'up')
  ) {
    return { type: 'hotkey', actionId: message.id, phase: message.phase };
  }

  if (message.type === 'error' && typeof message.reason === 'string') {
    return { type: 'error', actionId: message.id, reason: message.reason };
  }

  return undefined;
};

const createBridgeSource = ({
  serverId,
  serverName
}: TBridgeIdentity): THotkeySource => {
  const listeners = new Set<(event: THotkeySourceEvent) => void>();

  let socket: WebSocket | undefined;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let retryDelay = MIN_RETRY_MS;
  let status: THotkeyStatus = 'disconnected';
  let ready = false;
  let replaced = false;
  let latestBindings: THotkeyBinding[] = [];
  let attempts = 0;
  let activeToken: string | null = null;

  const emit = (event: THotkeySourceEvent) => {
    listeners.forEach((listener) => listener(event));
  };

  const emitStatus = (
    next: THotkeyStatus,
    capabilities: THotkeyCapabilities = NO_CAPABILITIES
  ) => {
    if (next === status) {
      return;
    }

    status = next;

    bridgeLogger.info(`status: ${status}`);
    emit({ type: 'status', status, capabilities });
  };

  const sendBindings = () => {
    if (!socket || !ready) {
      return;
    }

    const bindings = latestBindings.map(({ actionId, combo }) => ({
      id: actionId,
      combo
    }));

    bridgeLogger.info('sending binds', { bindings });

    socket.send(JSON.stringify({ type: 'bindings', bindings }));
  };

  const scheduleRetry = (delay: number) => {
    retryTimer = setTimeout(connect, delay);
  };

  const retryOrGiveUp = () => {
    if (attempts >= MAX_ATTEMPTS) {
      bridgeLogger.warn('gave up reaching the bridge', { attempts });
      emitStatus('failed');

      return;
    }

    emitStatus('disconnected');
    scheduleRetry(retryDelay);

    retryDelay = Math.min(retryDelay * 2, MAX_RETRY_MS);
  };

  const handleClosed = (closed: WebSocket) => {
    if (socket !== closed) {
      return;
    }

    socket = undefined;
    ready = false;

    if (replaced) {
      emitStatus('disconnected');

      return;
    }

    retryOrGiveUp();
  };

  const handleMessage = (current: WebSocket, raw: unknown) => {
    const text = String(raw);
    const message = parseMessage(text);

    if (!message) {
      bridgeLogger.warn('ignored a message it could not understand', {
        raw: text.slice(0, 200)
      });

      return;
    }

    if (message.type === 'replaced') {
      bridgeLogger.warn(
        'another tab for this server took over the bridge, not reconnecting'
      );

      replaced = true;

      current.close();

      return;
    }

    if (message.type === 'status') {
      bridgeLogger.info('ready', { capabilities: message.capabilities });

      ready = true;
      attempts = 0;
      retryDelay = MIN_RETRY_MS;
      emitStatus(message.status, message.capabilities);

      return;
    }

    emit(message);
  };

  const connect = () => {
    const token = getLocalStorageItem(LocalStorageKey.HOTKEY_BRIDGE_TOKEN);

    activeToken = token;

    // nothing to authenticate with: saving a token in the settings tries again
    if (!token) {
      bridgeLogger.warn('no pairing token, paste it in Settings, Hotkeys');
      emitStatus('failed');

      return;
    }

    attempts += 1;

    bridgeLogger.info('connecting', {
      url: BRIDGE_URL,
      serverId,
      attempt: attempts,
      of: MAX_ATTEMPTS
    });

    let current: WebSocket;

    try {
      current = new WebSocket(BRIDGE_URL);
    } catch (error) {
      // browsers can refuse a plain ws connection from an https page
      bridgeLogger.warn('the browser refused the connection', {
        error: String(error)
      });
      retryOrGiveUp();

      return;
    }

    socket = current;

    current.onopen = () => {
      bridgeLogger.info('socket open, sending hello');

      current.send(
        JSON.stringify({
          type: 'hello',
          v: PROTOCOL_VERSION,
          token,
          serverId,
          serverName
        })
      );
    };
    current.onmessage = (event) => handleMessage(current, event.data);
    current.onclose = () => handleClosed(current);
  };

  // closing on purpose: the close is reported later and must not count as a drop
  const dropSocket = () => {
    const closing = socket;

    socket = undefined;
    ready = false;

    if (closing) {
      closing.close();
    }
  };

  // a fresh run of attempts, for the first connection and for asking again
  const begin = () => {
    clearTimeout(retryTimer);
    dropSocket();

    replaced = false;
    attempts = 0;
    retryDelay = MIN_RETRY_MS;

    emitStatus('connecting');
    connect();
  };

  const stop = () => {
    clearTimeout(retryTimer);
    dropSocket();

    status = 'disconnected';
  };

  const reconnect = () => {
    if (listeners.size === 0) {
      return;
    }

    const token = getLocalStorageItem(LocalStorageKey.HOTKEY_BRIDGE_TOKEN);

    // a working connection is kept unless it was paired with another token
    if (status === 'connected' && token === activeToken) {
      return;
    }

    begin();
  };

  const setBindings = (bindings: THotkeyBinding[]) => {
    latestBindings = bindings;

    sendBindings();
  };

  const subscribe = (listener: (event: THotkeySourceEvent) => void) => {
    listeners.add(listener);

    if (listeners.size === 1) {
      begin();
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

export { createBridgeSource };
