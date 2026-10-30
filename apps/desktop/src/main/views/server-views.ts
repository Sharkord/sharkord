import {
  DESKTOP_CONNECTION_STATES,
  DESKTOP_MISMATCHES,
  type TDesktopConnectionState,
  type TDesktopMismatch,
  type TDesktopUnreadState
} from '@sharkord/shared';
import {
  desktopCapturer,
  session,
  shell,
  WebContentsView,
  type BrowserWindow,
  type DesktopCapturerSource
} from 'electron';
import path from 'path';
import { z } from 'zod';
import { BridgeChannel } from '../../shared/bridge-channels';
import { RAIL_WIDTH } from '../../shared/constants';
import type { TServer, TServerStatus } from '../../shared/types';
import {
  clearServerHotkeys,
  getHotkeyCapabilities,
  setServerHotkeys
} from '../hotkeys/global-hotkeys';
import { notificationSchema } from '../notifications/notification-schema';
import { showNotification } from '../notifications/show-notification';
import {
  startSystemAudio,
  stopSystemAudio
} from '../screen-share/system-audio';
import { checkForUpdatesIfStale } from '../updater/auto-updater';

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

const connectionStateSchema = z.enum(DESKTOP_CONNECTION_STATES);

const mismatchSchema = z.enum(DESKTOP_MISMATCHES);

const ERR_ABORTED = -3;
// the dark background of the client, shown until its page paints instead of white
const VIEW_BACKGROUND = '#0a0a0a';
const LOAD_TIMEOUT_MS = 15_000;
const THUMBNAIL_SIZE = { width: 320, height: 180 };
// the client asks for system audio right after the share starts, outside this window it is refused
// ponytail: a time window, tie it to the capture's lifetime if a page needs it later on
const SYSTEM_AUDIO_WINDOW_MS = 15_000;

const hotkeyBindingsSchema = z
  .array(
    z.object({
      actionId: z.string().min(1).max(200),
      combo: z.string().min(1).max(100)
    })
  )
  .max(100);

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

type TServerViewsOptions = {
  onChange: () => void;
  onNotificationClick: (serverId: string) => void;
  isMediaAllowed: (serverId: string) => boolean;
  requestMediaAccess: (server: TServer) => Promise<boolean>;
  pickSource: (sources: DesktopCapturerSource[]) => Promise<string | null>;
};

// the shell is a view of its own so it can be drawn over the server views
const createServerViews = (
  win: BrowserWindow,
  shellView: WebContentsView,
  {
    onChange,
    onNotificationClick,
    isMediaAllowed,
    requestMediaAccess,
    pickSource
  }: TServerViewsOptions
) => {
  const views = new Map<string, WebContentsView>();
  const unread = new Map<string, TDesktopUnreadState>();
  const pageStates = new Map<string, TPageState>();
  const connectionStates = new Map<string, TDesktopConnectionState>();
  const connectedClients = new Set<string>();
  const mismatches = new Map<string, TDesktopMismatch>();
  const waiters = new Set<() => void>();
  const displayCaptureAt = new Map<string, number>();
  // insertion ordered, the last one joined voice most recently
  const voiceServerIds = new Set<string>();
  let activeId: string | null = null;
  let layoutState: TLayout = { railVisible: false, fullShell: false };
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
        const isAllowed =
          ALLOWED_PERMISSIONS.has(permission) &&
          isSameOrigin(details.requestingUrl, contents.getURL());

        if (!isAllowed) {
          callback(false);

          return;
        }

        if (permission === 'media') {
          const answerMediaRequest = async () => {
            try {
              const isGranted = await requestMediaAccess(server);

              callback(isGranted);
            } catch {
              callback(false);
            }
          };

          answerMediaRequest();

          return;
        }

        callback(true);
      }
    );

    serverSession.setPermissionCheckHandler(
      (contents, permission, requestingOrigin) => {
        if (
          contents === null ||
          !ALLOWED_PERMISSIONS.has(permission) ||
          !isSameOrigin(requestingOrigin, contents.getURL())
        ) {
          return false;
        }

        if (permission === 'media') {
          return isMediaAllowed(server.id);
        }

        return true;
      }
    );

    // no useSystemPicker: on macos 15+ it replaces this handler, and the loopback audio with it
    serverSession.setDisplayMediaRequestHandler(async (request, callback) => {
      let source: DesktopCapturerSource | undefined;

      try {
        const sources = await desktopCapturer.getSources({
          types: ['screen', 'window'],
          thumbnailSize: THUMBNAIL_SIZE
        });

        [source] = sources;

        if (sources.length > 1) {
          const sourceId = await pickSource(sources);

          source = sources.find(({ id }) => id === sourceId);
        }
      } catch (error) {
        console.warn('screen share: no source was picked', error);
      }

      if (!source) {
        callback({});

        return;
      }

      displayCaptureAt.set(server.id, Date.now());

      // loopback records everything playing on windows and macos 14.2+ (which needs
      // NSAudioCaptureUsageDescription or the track arrives silent), linux uses the virtual microphone
      const canLoopback =
        process.platform === 'win32' || process.platform === 'darwin';

      // electron rejects an audio key that is present but undefined
      if (request.audioRequested && canLoopback) {
        callback({ video: source, audio: 'loopback' });

        return;
      }

      callback({ video: source });
    });

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

    view.webContents.ipc.on(BridgeChannel.CLIENT_CONNECTED, () => {
      connectedClients.add(server.id);
      changed();
    });

    view.webContents.ipc.on(BridgeChannel.CLIENT_MISMATCH, (_event, value) => {
      const parsed = mismatchSchema.safeParse(value);

      if (!parsed.success) {
        return;
      }

      mismatches.set(server.id, parsed.data);
      changed();

      // the server already ships a newer client, an update is likely out
      if (parsed.data === 'app-outdated') {
        checkForUpdatesIfStale();
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
      ({ isMainFrame, isSameDocument }) => {
        if (!isMainFrame || isSameDocument) {
          return;
        }

        pageStates.set(server.id, 'loading');
        unread.delete(server.id);
        connectionStates.delete(server.id);
        connectedClients.delete(server.id);
        mismatches.delete(server.id);
        voiceServerIds.delete(server.id);
        displayCaptureAt.delete(server.id);

        stopSystemAudio(server.id);
        clearServerHotkeys(server.id);
        changed();
      }
    );

    view.webContents.on('did-finish-load', () => {
      if (pageStates.get(server.id) === 'error') {
        return;
      }

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
      unread.delete(server.id);
      voiceServerIds.delete(server.id);

      stopSystemAudio(server.id);
      clearServerHotkeys(server.id);
      changed();
    });

    view.webContents.on('destroyed', () => {
      stopSystemAudio(server.id);
      clearServerHotkeys(server.id);
    });

    view.webContents.ipc.handle(
      BridgeChannel.SET_HOTKEYS,
      (_event, payload) => {
        const parsed = hotkeyBindingsSchema.safeParse(payload);

        if (!parsed.success) {
          return [];
        }

        return setServerHotkeys(
          server.id,
          parsed.data,
          (actionId, phase) => {
            view.webContents.send(
              BridgeChannel.HOTKEY_PRESSED,
              actionId,
              phase
            );
          },
          (errors) => {
            view.webContents.send(BridgeChannel.HOTKEY_ERRORS, errors);
          }
        );
      }
    );

    view.webContents.ipc.handle(
      BridgeChannel.GET_HOTKEY_CAPABILITIES,
      getHotkeyCapabilities
    );

    view.webContents.ipc.handle(BridgeChannel.START_SYSTEM_AUDIO, () => {
      const capturedAt = displayCaptureAt.get(server.id);

      if (
        capturedAt === undefined ||
        Date.now() - capturedAt > SYSTEM_AUDIO_WINDOW_MS
      ) {
        return false;
      }

      return startSystemAudio(server.id);
    });

    view.webContents.ipc.on(BridgeChannel.SET_VOICE_ACTIVE, (_event, value) => {
      if (typeof value !== 'boolean') {
        return;
      }

      voiceServerIds.delete(server.id);

      if (value) {
        voiceServerIds.add(server.id);
      }

      onChange();
    });

    view.webContents.ipc.handle(BridgeChannel.STOP_SYSTEM_AUDIO, () => {
      stopSystemAudio(server.id);
    });

    view.webContents.ipc.on(
      BridgeChannel.SHOW_NOTIFICATION,
      (_event, payload) => {
        const parsed = notificationSchema.safeParse(payload);

        if (!parsed.success) {
          return;
        }

        const notification = parsed.data;

        showNotification(notification, serverSession, () => {
          onNotificationClick(server.id);

          // the server may have been removed while the notification was up
          if (notification.target && !view.webContents.isDestroyed()) {
            view.webContents.send(
              BridgeChannel.NOTIFICATION_CLICKED,
              notification.target
            );
          }
        }).catch(console.error);
      }
    );

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

    view.setBackgroundColor(VIEW_BACKGROUND);
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
      return 'loading';
    }

    const mismatch = mismatches.get(id);

    if (mismatch) {
      return mismatch;
    }

    // a page that never connects, like a server from before the desktop app, never reports its state either
    if (!connectedClients.has(id)) {
      return 'connected';
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
        const status = getStatus(id);

        if (status !== 'loading' && status !== 'connecting') {
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

  const reload = (server: TServer) => {
    const view = views.get(server.id);

    if (!view) {
      return;
    }

    // the address and not reload(), a page that never loaded has nothing to reload
    view.webContents.loadURL(server.url).catch(() => {});
  };

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
        reload(server);
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
    connectedClients.delete(id);
    mismatches.delete(id);
    voiceServerIds.delete(id);
    displayCaptureAt.delete(id);
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

  const getVoiceServerId = () => {
    const ids = [...voiceServerIds];

    return ids.at(-1) ?? null;
  };

  const setBackgroundThrottled = (value: boolean) => {
    backgroundThrottled = value;

    for (const view of views.values()) {
      view.webContents.setBackgroundThrottling(value);
    }
  };

  win.contentView.addChildView(shellView);
  win.on('resize', layout);

  return {
    show,
    load,
    has,
    reload,
    getStatus,
    hideAll,
    remove,
    setLayout,
    getUnread,
    getVoiceServerId,
    setBackgroundThrottled
  };
};

type TServerViews = ReturnType<typeof createServerViews>;

export { createServerViews, getPartition };
export type { TServerViews };
