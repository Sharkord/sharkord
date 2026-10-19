import type { TDesktopConfirmOptions } from '@sharkord/shared';
import type {
  TAddServerError,
  TDesktopSettings,
  TServer,
  TServersState
} from '../../shared/types';
import type { TServerViews } from '../views/server-views';
import { fetchServer } from './fetch-server';
import { normalizeServerUrl } from './normalize-server-url';
import { readStore, writeStore } from './server-store';

const isSameServer = (first: TServer, second: TServer) =>
  first.name === second.name &&
  first.url === second.url &&
  first.iconUrl === second.iconUrl;

const createServerController = (
  filePath: string,
  views: TServerViews,
  onChange: (state: TServersState) => void
) => {
  const stored = readStore(filePath);

  let servers = stored.servers;
  let railHidden = stored.railHidden;
  let selectedId: string | null = null;
  let settings = stored.settings;
  let adding = false;
  let pendingAddress: string | null = null;
  let settingsOpen = false;
  let overlay = false;

  views.setBackgroundThrottled(settings.throttleHiddenServers);

  const save = () => {
    writeStore(filePath, { servers, railHidden, selectedId, settings });
  };

  // the saved id may point at a server that is gone if the file was edited by hand
  const restored = servers.find(({ id }) => id === stored.selectedId);
  const [first] = servers;

  if (restored) {
    selectedId = restored.id;
  } else if (first) {
    selectedId = first.id;
  }

  const getState = (): TServersState => ({
    servers,
    selectedId,
    adding,
    pendingAddress,
    settingsOpen,
    settings,
    railVisible: servers.length > 0 && !railHidden,
    unread: views.getUnread(),
    statuses: Object.fromEntries(
      servers.map(({ id }) => [id, views.getStatus(id)])
    )
  });

  const applyLayout = (state: TServersState) => {
    views.setLayout({
      railVisible: state.railVisible,
      fullShell:
        state.adding ||
        state.settingsOpen ||
        state.servers.length === 0 ||
        overlay
    });
  };

  const sync = () => {
    const state = getState();
    const selected = servers.find((candidate) => candidate.id === selectedId);

    applyLayout(state);

    if (selected && !adding && !settingsOpen) {
      views.show(selected);
    } else {
      views.hideAll();
    }

    onChange(state);
  };

  const notify = () => {
    onChange(getState());
  };

  const refresh = async () => {
    const fetched = await Promise.all(
      servers.map((server) => fetchServer(server.url))
    );

    const latestById = new Map<string, TServer>();

    for (const latest of fetched) {
      if (latest) {
        latestById.set(latest.id, latest);
      }
    }

    let changed = false;

    servers = servers.map((server) => {
      const latest = latestById.get(server.id);

      if (!latest || isSameServer(latest, server)) {
        return server;
      }

      changed = true;

      return latest;
    });

    if (!changed) {
      return;
    }

    save();
    sync();
  };

  // one server at a time, starting with the selected one, so startup is not a burst of page loads
  const loadAll = async () => {
    const selected = servers.find(({ id }) => id === selectedId);

    if (selected) {
      await views.load(selected);
    }

    let next = servers.find(({ id }) => !views.has(id));

    while (next) {
      await views.load(next);

      next = servers.find(({ id }) => !views.has(id));
    }
  };

  const select = (id: string) => {
    const exists = servers.some((candidate) => candidate.id === id);

    if (!exists) {
      return;
    }

    selectedId = id;
    adding = false;
    pendingAddress = null;
    settingsOpen = false;

    save();
    sync();
  };

  const setAdding = (value: boolean) => {
    adding = value;
    pendingAddress = null;

    if (value) {
      settingsOpen = false;
    }

    sync();
  };

  const openAddServer = (input: string) => {
    const origin = normalizeServerUrl(input);
    const existing = servers.find(({ url }) => url === origin);

    if (existing) {
      select(existing.id);

      return;
    }

    adding = true;
    pendingAddress = input;
    settingsOpen = false;

    sync();
  };

  const setSettingsOpen = (value: boolean) => {
    settingsOpen = value;

    if (value) {
      adding = false;
    }

    sync();
  };

  const updateSettings = (patch: Partial<TDesktopSettings>) => {
    settings = { ...settings, ...patch };

    views.setBackgroundThrottled(settings.throttleHiddenServers);
    save();
    notify();
  };

  const setOverlay = (value: boolean) => {
    overlay = value;

    applyLayout(getState());
  };

  const setRailHidden = (value: boolean) => {
    railHidden = value;

    save();
    sync();
  };

  const toggleRail = () => {
    setRailHidden(getState().railVisible);
  };

  const confirm = async (
    options: TDesktopConfirmOptions
  ): Promise<boolean | null> => {
    if (!selectedId || adding) {
      return null;
    }

    return views.requestConfirmation(selectedId, options);
  };

  const add = async (input: string): Promise<TAddServerError | null> => {
    const origin = normalizeServerUrl(input);

    if (!origin) {
      return 'invalid-url';
    }

    const server = await fetchServer(origin);

    if (!server) {
      return 'unreachable';
    }

    if (servers.some((candidate) => candidate.id === server.id)) {
      return 'duplicate';
    }

    // the first server of a fresh start should be seen with its list, later ones
    // respect whatever the user chose
    if (servers.length === 0) {
      railHidden = false;
    }

    servers = [...servers, server];
    selectedId = server.id;
    adding = false;
    pendingAddress = null;

    save();

    sync();

    return null;
  };

  const remove = (id: string) => {
    servers = servers.filter((candidate) => candidate.id !== id);

    views.remove(id);

    if (selectedId === id) {
      const [next] = servers;

      selectedId = next ? next.id : null;
    }

    save();

    sync();
  };

  refresh();

  return {
    getState,
    sync,
    notify,
    loadAll,
    select,
    setAdding,
    openAddServer,
    setSettingsOpen,
    updateSettings,
    setOverlay,
    setRailHidden,
    toggleRail,
    confirm,
    add,
    remove
  };
};

type TServerController = ReturnType<typeof createServerController>;

export { createServerController };
export type { TServerController };
