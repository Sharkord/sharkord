import type {
  TDesktopConfirmOptions,
  TDesktopConnectionState,
  TDesktopUnreadState
} from '@sharkord/shared';
import {
  desktopCapturer,
  ipcMain,
  session,
  shell,
  WebContentsView,
  type BrowserWindow,
  type IpcMainEvent
} from 'electron';
import path from 'path';
import { z } from 'zod';
import { BridgeChannel } from '../../shared/bridge-channels';
import { RAIL_WIDTH } from '../../shared/constants';
import type { TServer, TServerStatus } from '../../shared/types';
import {
  startSystemAudio,
  stopSystemAudio
} from '../screen-share/system-audio';

type TPageState = 'loading' | 'loaded' | 'error';

type TLayout = {
  railVisible: boolean;
  fullShell: boolean;
};

const ALLOWED_PERMISSIONS = new Set([
  'media',
  'display-capture',
  'notifications',
  'fullscreen',
  'clipboard-sanitized-write'
]);

const unreadStateSchema = z.object({
  count: z.number().int().min(0),
  mentioned: z.boolean()
});

const connectionStateSchema = z.enum([
  'connecting',
  'connected',
  'signed-out',
  'disconnected'
]);

const ERR_ABORTED = -3;
const LOAD_TIMEOUT_MS = 15_000;

const getPartition = (id: string) => `persist:server-${id}`;

const isSameOrigin = (first: string, second: string) => {
  try {
    const firstUrl = new URL(first);
    const secondUrl = new URL(second);

    return firstUrl.origin === secondUrl.origin;
  } catch {
    return false;
  }
};

const openExternal = (url: string) => {
  // anything but http(s) could launch arbitrary local handlers
  if (!/^https?:\/\//i.test(url)) {
    return;
  }

  shell.openExternal(url).catch(console.error);
};

// the shell is a view of its own so it can be drawn over the server views
const createServerViews = (
  win: BrowserWindow,
  shellView: WebContentsView,
  onChange: () => void
) => {
  const views = new Map<string, WebContentsView>();
  const unread = new Map<string, TDesktopUnreadState>();
  const pageStates = new Map<string, TPageState>();
  const connectionStates = new Map<string, TDesktopConnectionState>();
  const waiters = new Set<() => void>();
  let activeId: string | null = null;
  let layoutState: TLayout = { railVisible: false, fullShell: false };
  let nextRequestId = 0;
  let backgroundThrottled = true;

  const layout = () => {
    const { width, height } = win.getContentBounds();
    const inset = layoutState.railVisible ? RAIL_WIDTH : 0;

    for (const view of views.values()) {
      view.setBounds({
        x: inset,
        y: 0,
        width: Math.max(width - inset, 0),
        height
      });
    }

    if (layoutState.fullShell) {
      shellView.setBounds({ x: 0, y: 0, width, height });
      shellView.setVisible(true);
    } else {
      shellView.setBounds({ x: 0, y: 0, width: inset, height });
      shellView.setVisible(inset > 0);
    }
  };

  const createView = (server: TServer) => {
    // one partition per server keeps logins and storage isolated from each other
    const serverSession = session.fromPartition(getPartition(server.id));

    // compared with the page that is open and not with the address that was added,
    // a server may redirect elsewhere, as the dev server does to its web client
    serverSession.setPermissionRequestHandler(
      (contents, permission, callback, details) => {
        callback(
          ALLOWED_PERMISSIONS.has(permission) &&
            isSameOrigin(details.requestingUrl, contents.getURL())
        );
      }
    );

    serverSession.setPermissionCheckHandler(
      (contents, permission, requestingOrigin) =>
        contents !== null &&
        ALLOWED_PERMISSIONS.has(permission) &&
        isSameOrigin(requestingOrigin, contents.getURL())
    );

    serverSession.setDisplayMediaRequestHandler(
      async (request, callback) => {
        const sources = await desktopCapturer.getSources({
          types: ['screen', 'window']
        });
        const [source] = sources;

        if (!source) {
          callback({});

          return;
        }

        // loopback records everything playing, only windows has it, linux uses the virtual microphone
        const canLoopback = process.platform === 'win32';

        // electron rejects an audio key that is present but undefined
        if (request.audioRequested && canLoopback) {
          callback({ video: source, audio: 'loopback' });

          return;
        }

        callback({ video: source });
      },
      { useSystemPicker: true }
    );

    const view = new WebContentsView({
      webPreferences: {
        session: serverSession,
        preload: path.join(__dirname, '../preload/server-view.js'),
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        backgroundThrottling: backgroundThrottled
      }
    });

    view.webContents.ipc.on(BridgeChannel.SET_UNREAD, (_event, state) => {
      const parsed = unreadStateSchema.safeParse(state);

      if (!parsed.success) {
        return;
      }

      unread.set(server.id, parsed.data);
      onChange();
    });

    view.webContents.ipc.on(
      BridgeChannel.SET_CONNECTION_STATE,
      (_event, state) => {
        const parsed = connectionStateSchema.safeParse(state);

        if (!parsed.success) {
          return;
        }

        connectionStates.set(server.id, parsed.data);
        changed();
      }
    );

    view.webContents.on(
      'did-start-navigation',
      (_event, _url, isInPlace, isMainFrame) => {
        if (!isMainFrame || isInPlace) {
          return;
        }

        pageStates.set(server.id, 'loading');
        connectionStates.delete(server.id);

        stopSystemAudio(server.id);
        changed();
      }
    );

    view.webContents.on('did-finish-load', () => {
      pageStates.set(server.id, 'loaded');
      changed();
    });

    view.webContents.on(
      'did-fail-load',
      (_event, errorCode, _description, _url, isMainFrame) => {
        if (!isMainFrame || errorCode === ERR_ABORTED) {
          return;
        }

        pageStates.set(server.id, 'error');
        changed();
      }
    );

    view.webContents.on('render-process-gone', () => {
      pageStates.set(server.id, 'error');
      stopSystemAudio(server.id);
      changed();
    });

    view.webContents.on('destroyed', () => {
      stopSystemAudio(server.id);
    });

    view.webContents.ipc.handle(BridgeChannel.START_SYSTEM_AUDIO, () =>
      startSystemAudio(server.id)
    );

    view.webContents.ipc.handle(BridgeChannel.STOP_SYSTEM_AUDIO, () => {
      stopSystemAudio(server.id);
    });

    view.webContents.setWindowOpenHandler(({ url }) => {
      openExternal(url);

      return { action: 'deny' };
    });

    view.webContents.on('will-navigate', (event, url) => {
      if (isSameOrigin(url, view.webContents.getURL())) {
        return;
      }

      event.preventDefault();
      openExternal(url);
    });

    win.contentView.addChildView(view);
    win.contentView.addChildView(shellView);

    view.webContents.loadURL(server.url).catch(() => {});

    return view;
  };

  const getStatus = (id: string): TServerStatus => {
    if (!views.has(id)) {
      return 'idle';
    }

    const pageState = pageStates.get(id);

    if (pageState === 'error') {
      return 'error';
    }

    if (pageState !== 'loaded') {
      return 'connecting';
    }

    return connectionStates.get(id) ?? 'connecting';
  };

  const changed = () => {
    for (const waiter of waiters) {
      waiter();
    }

    onChange();
  };

  const getOrCreateView = (server: TServer) => {
    let view = views.get(server.id);

    if (!view) {
      view = createView(server);

      views.set(server.id, view);
      layout();
    }

    return view;
  };

  const waitUntilSettled = (id: string) =>
    new Promise<void>((resolve) => {
      const finish = () => {
        waiters.delete(check);
        clearTimeout(timeout);
        resolve();
      };

      const check = () => {
        if (getStatus(id) !== 'connecting') {
          finish();
        }
      };

      const timeout = setTimeout(finish, LOAD_TIMEOUT_MS);

      waiters.add(check);
      check();
    });

  const load = (server: TServer) => {
    const view = getOrCreateView(server);

    if (server.id !== activeId) {
      view.setVisible(false);
    }

    return waitUntilSettled(server.id);
  };

  const has = (id: string) => views.has(id);

  const show = (server: TServer) => {
    const view = getOrCreateView(server);

    for (const [id, other] of views) {
      other.setVisible(id === server.id);
    }

    // sync runs on every change, only a switch of server may take the keyboard
    if (activeId !== server.id) {
      activeId = server.id;
      view.webContents.focus();

      if (getStatus(server.id) === 'error') {
        view.webContents.reload();
      }
    }
  };

  const hideAll = () => {
    activeId = null;

    for (const view of views.values()) {
      view.setVisible(false);
    }
  };

  const remove = (id: string) => {
    const view = views.get(id);

    if (view) {
      win.contentView.removeChildView(view);
      view.webContents.close();
      views.delete(id);
    }

    unread.delete(id);
    pageStates.delete(id);
    connectionStates.delete(id);
    // releases anything still waiting on this server to settle
    changed();

    if (activeId === id) {
      activeId = null;
    }

    const serverSession = session.fromPartition(getPartition(id));

    serverSession.clearStorageData().catch(console.error);
  };

  const setLayout = (next: TLayout) => {
    const wasFull = layoutState.fullShell;

    if (
      next.railVisible === layoutState.railVisible &&
      next.fullShell === layoutState.fullShell
    ) {
      return;
    }

    layoutState = next;
    layout();

    for (const view of views.values()) {
      view.webContents.send(
        BridgeChannel.RAIL_VISIBLE_CHANGED,
        next.railVisible
      );
    }

    if (next.fullShell && !wasFull) {
      shellView.webContents.focus();
    }

    const active = activeId ? views.get(activeId) : undefined;

    if (!next.fullShell && wasFull && active) {
      active.webContents.focus();
    }
  };

  const getUnread = () => Object.fromEntries(unread);

  const setBackgroundThrottled = (value: boolean) => {
    backgroundThrottled = value;

    for (const view of views.values()) {
      view.webContents.setBackgroundThrottling(value);
    }
  };

  const requestConfirmation = (
    id: string,
    options: TDesktopConfirmOptions
  ): Promise<boolean | null> => {
    return new Promise((resolve) => {
      const view = views.get(id);

      if (!view) {
        resolve(null);

        return;
      }

      const { webContents } = view;

      nextRequestId += 1;

      const requestId = nextRequestId;

      const finish = (answer: boolean | null) => {
        ipcMain.removeListener(BridgeChannel.CONFIRM_RESPONSE, onResponse);

        webContents.removeListener('destroyed', onGone);
        webContents.removeListener('render-process-gone', onGone);
        webContents.removeListener('did-start-navigation', onNavigate);

        resolve(answer);
      };

      const onGone = () => finish(null);

      const onNavigate = (
        _event: unknown,
        _url: string,
        _isInPlace: boolean,
        isMainFrame: boolean
      ) => {
        if (isMainFrame) {
          finish(null);
        }
      };

      const onResponse = (
        event: IpcMainEvent,
        responseId: number,
        answer: boolean | null
      ) => {
        if (responseId === requestId && event.sender === webContents) {
          finish(answer);
        }
      };

      ipcMain.on(BridgeChannel.CONFIRM_RESPONSE, onResponse);
      webContents.once('destroyed', onGone);
      webContents.once('render-process-gone', onGone);
      webContents.on('did-start-navigation', onNavigate);
      webContents.send(BridgeChannel.CONFIRM_REQUEST, requestId, options);
    });
  };

  win.contentView.addChildView(shellView);
  win.on('resize', layout);

  return {
    show,
    load,
    has,
    getStatus,
    hideAll,
    remove,
    setLayout,
    requestConfirmation,
    getUnread,
    setBackgroundThrottled
  };
};

type TServerViews = ReturnType<typeof createServerViews>;

export { createServerViews, getPartition };
export type { TServerViews };
