import type {
  TAddServerError,
  TServer,
  TServersState
} from '../../shared/types';
import type { TServerViews } from '../views/server-views';
import { fetchServer } from './fetch-server';
import { normalizeServerUrl } from './normalize-server-url';
import { readStore, writeStore } from './server-store';

const createServerController = (
  filePath: string,
  views: TServerViews,
  onChange: (state: TServersState) => void
) => {
  const stored = readStore(filePath);

  let servers = stored.servers;
  let railHidden = stored.railHidden;
  let selectedId: string | null = null;
  let adding = false;
  let overlay = false;

  const save = () => {
    writeStore(filePath, { servers, railHidden });
  };

  const [first] = servers;

  if (first) {
    selectedId = first.id;
  }

  const getState = (): TServersState => ({
    servers,
    selectedId,
    adding,
    railVisible: servers.length > 0 && !railHidden
  });

  const applyLayout = (state: TServersState) => {
    views.setLayout({
      railVisible: state.railVisible,
      fullShell: state.adding || state.servers.length === 0 || overlay
    });
  };

  const sync = () => {
    const state = getState();
    const selected = servers.find((candidate) => candidate.id === selectedId);

    applyLayout(state);

    if (selected && !adding) {
      views.show(selected);
    } else {
      views.hideAll();
    }

    onChange(state);
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

    servers = servers.map((server) => latestById.get(server.id) ?? server);

    save();
    sync();
  };

  const select = (id: string) => {
    const exists = servers.some((candidate) => candidate.id === id);

    if (!exists) {
      return;
    }

    selectedId = id;
    adding = false;

    sync();
  };

  const setAdding = (value: boolean) => {
    adding = value;

    sync();
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

    save();

    selectedId = server.id;
    adding = false;

    sync();

    return null;
  };

  const remove = (id: string) => {
    servers = servers.filter((candidate) => candidate.id !== id);

    save();

    views.remove(id);

    if (selectedId === id) {
      const [next] = servers;

      selectedId = next ? next.id : null;
    }

    sync();
  };

  refresh();

  return {
    getState,
    sync,
    select,
    setAdding,
    setOverlay,
    setRailHidden,
    add,
    remove
  };
};

type TServerController = ReturnType<typeof createServerController>;

export { createServerController };
export type { TServerController };
