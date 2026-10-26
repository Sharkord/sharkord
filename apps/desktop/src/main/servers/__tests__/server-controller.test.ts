import type { TDesktopUnreadState } from '@sharkord/shared';
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import type {
  TServer,
  TServersState,
  TServerStatus
} from '../../../shared/types';
import type { TServerViews } from '../../views/server-views';
import { createServerController } from '../server-controller';
import { DEFAULT_SETTINGS } from '../server-store';

type TStub = ReturnType<typeof Bun.serve>;

const stubs: TStub[] = [];
const names = new Map<string, string>();

const startServer = (serverId: string, name: string) => {
  names.set(serverId, name);

  const stub = Bun.serve({
    port: 0,
    fetch: () =>
      Response.json({ serverId, name: names.get(serverId), logo: null })
  });

  stubs.push(stub);

  return `http://localhost:${stub.port}`;
};

const createFakeViews = () => {
  const calls = {
    shown: [] as string[],
    hidden: 0,
    removed: [] as string[],
    layouts: [] as { railVisible: boolean; fullShell: boolean }[],
    unread: {} as Record<string, TDesktopUnreadState>,
    statuses: {} as Record<string, TServerStatus>,
    loaded: [] as string[],
    pendingLoads: [] as (() => void)[],
    throttled: [] as boolean[]
  };

  const opened = new Set<string>();

  const views = {
    show: (server: TServer) => {
      opened.add(server.id);
      calls.shown.push(server.id);
    },
    load: (server: TServer) => {
      opened.add(server.id);
      calls.loaded.push(server.id);

      return new Promise<void>((resolve) => calls.pendingLoads.push(resolve));
    },
    has: (id: string) => opened.has(id),
    getStatus: (id: string) => calls.statuses[id] ?? 'idle',
    hideAll: () => calls.hidden++,
    remove: (id: string) => calls.removed.push(id),
    setLayout: (layout: { railVisible: boolean; fullShell: boolean }) =>
      calls.layouts.push(layout),
    getUnread: () => calls.unread,
    setBackgroundThrottled: (value: boolean) => calls.throttled.push(value)
  } as unknown as TServerViews;

  return { views, calls };
};

const waitFor = async (condition: () => boolean) => {
  for (let attempt = 0; attempt < 40 && !condition(); attempt++) {
    await Bun.sleep(50);
  }
};

describe('server controller', () => {
  let dir = '';
  let filePath = '';
  let states: TServersState[] = [];

  const create = () => {
    const { views, calls } = createFakeViews();
    const controller = createServerController(filePath, views, (state) =>
      states.push(state)
    );

    return { controller, calls };
  };

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'sharkord-controller-'));
    filePath = path.join(dir, 'servers.json');
    states = [];
  });

  afterEach(async () => {
    for (const stub of stubs) {
      await stub.stop(true);
    }

    stubs.length = 0;
    names.clear();
    rmSync(dir, { recursive: true, force: true });
  });

  test('a first start has no servers and no server list', () => {
    const { controller } = create();

    expect(controller.getState()).toEqual({
      servers: [],
      selectedId: null,
      adding: false,
      pendingAddress: null,
      settingsOpen: false,
      settingsTab: 'general',
      settings: DEFAULT_SETTINGS,
      railVisible: false,
      unread: {},
      statuses: {}
    });
  });

  test('every server is listed with the status of its view', async () => {
    const { controller, calls } = create();

    await controller.add(startServer('one', 'One'));
    await controller.add(startServer('two', 'Two'));
    calls.statuses = { one: 'error' };

    expect(controller.getState().statuses).toEqual({
      one: 'error',
      two: 'idle'
    });
  });

  test('loading all servers starts with the selected one and loads the rest one at a time', async () => {
    const first = create();

    await first.controller.add(startServer('one', 'One'));
    await first.controller.add(startServer('two', 'Two'));
    await first.controller.add(startServer('three', 'Three'));

    const { controller, calls } = create();
    const finishNextLoad = async () => {
      const [resolve] = calls.pendingLoads.splice(0, 1);

      resolve?.();
      await Bun.sleep(0);
    };

    const done = controller.loadAll();

    expect(calls.loaded).toEqual(['three']);

    await finishNextLoad();
    expect(calls.loaded).toEqual(['three', 'one']);

    await finishNextLoad();
    expect(calls.loaded).toEqual(['three', 'one', 'two']);

    await finishNextLoad();
    await done;
    expect(calls.loaded).toEqual(['three', 'one', 'two']);
  });

  test('loading all servers skips servers that are already open', async () => {
    const { controller, calls } = create();

    await controller.add(startServer('one', 'One'));
    await controller.add(startServer('two', 'Two'));

    const done = controller.loadAll();

    expect(calls.loaded).toEqual(['two']);

    calls.pendingLoads.splice(0, 1)[0]?.();
    await done;

    expect(calls.loaded).toEqual(['two']);
  });

  test('the settings can open on a given tab and go back to the first one next time', async () => {
    const { controller } = create();

    await controller.add(startServer('one', 'One'));

    controller.setSettingsOpen(true, 'updates');
    expect(controller.getState().settingsTab).toBe('updates');

    controller.setSettingsOpen(false);
    controller.setSettingsOpen(true);
    expect(controller.getState().settingsTab).toBe('general');
  });

  test('opening the settings hides the server views and fills the window with the shell', async () => {
    const { controller, calls } = create();

    await controller.add(startServer('one', 'One'));
    controller.setSettingsOpen(true);

    expect(controller.getState().settingsOpen).toBe(true);
    expect(controller.getState().settingsTab).toBe('general');
    expect(calls.hidden).toBeGreaterThan(0);
    expect(calls.layouts.at(-1)).toEqual({
      railVisible: true,
      fullShell: true
    });

    controller.setSettingsOpen(false);

    expect(calls.shown.at(-1)).toBe('one');
    expect(calls.layouts.at(-1)).toEqual({
      railVisible: true,
      fullShell: false
    });
  });

  test('opening the settings leaves the add screen and opening the add screen closes the settings', async () => {
    const { controller } = create();

    await controller.add(startServer('one', 'One'));
    controller.setAdding(true);
    controller.setSettingsOpen(true);

    expect(controller.getState().adding).toBe(false);

    controller.setAdding(true);

    expect(controller.getState().settingsOpen).toBe(false);
  });

  test('selecting a server closes the settings', async () => {
    const { controller } = create();

    await controller.add(startServer('one', 'One'));
    controller.setSettingsOpen(true);
    controller.select('one');

    expect(controller.getState().settingsOpen).toBe(false);
  });

  test('changed settings are announced and come back after a restart', () => {
    const first = create();

    first.controller.updateSettings({ connectAllOnStartup: true });

    expect(states.at(-1)?.settings).toEqual({
      ...DEFAULT_SETTINGS,
      connectAllOnStartup: true
    });

    const second = create();

    expect(second.controller.getState().settings).toEqual({
      ...DEFAULT_SETTINGS,
      connectAllOnStartup: true
    });
  });

  test('the views are throttled by default when the app starts', () => {
    const { calls } = create();

    expect(calls.throttled).toEqual([true]);
  });

  test('turning off throttling applies to the views and is kept after a restart', () => {
    const first = create();

    first.controller.updateSettings({ throttleHiddenServers: false });

    expect(first.calls.throttled.at(-1)).toBe(false);

    const second = create();

    expect(second.calls.throttled).toEqual([false]);
  });

  test('a link to a new server opens the add screen with its address filled in', async () => {
    const { controller, calls } = create();

    await controller.add(startServer('one', 'One'));
    controller.setSettingsOpen(true);
    controller.openAddServer('https://chat.example.com');

    const state = controller.getState();

    expect(state.adding).toBe(true);
    expect(state.settingsOpen).toBe(false);
    expect(state.pendingAddress).toBe('https://chat.example.com');
    expect(state.servers.map(({ id }) => id)).toEqual(['one']);
    expect(calls.layouts.at(-1)).toEqual({
      railVisible: true,
      fullShell: true
    });
  });

  test('a link to a server that is already added opens it', async () => {
    const { controller } = create();
    const firstUrl = startServer('one', 'One');

    await controller.add(firstUrl);
    await controller.add(startServer('two', 'Two'));
    controller.openAddServer(`${firstUrl}/some/page`);

    const state = controller.getState();

    expect(state.selectedId).toBe('one');
    expect(state.adding).toBe(false);
    expect(state.pendingAddress).toBeNull();
  });

  test('leaving the add screen forgets the address from a link', () => {
    const { controller } = create();

    controller.openAddServer('https://chat.example.com');
    controller.setAdding(false);

    expect(controller.getState().pendingAddress).toBeNull();
  });

  test('adding the server from a link forgets its address', async () => {
    const { controller } = create();
    const url = startServer('one', 'One');

    controller.openAddServer(url);
    await controller.add(url);

    expect(controller.getState().pendingAddress).toBeNull();
  });

  test('notify publishes the unread state of the views', () => {
    const { controller, calls } = create();

    calls.unread = { first: { count: 3, mentioned: true } };
    controller.notify();

    expect(states.at(-1)?.unread).toEqual({
      first: { count: 3, mentioned: true }
    });
  });

  test('the first server added becomes the default and shows the server list', async () => {
    const { controller } = create();
    const origin = startServer('one', 'One');

    expect(await controller.add(origin)).toBeNull();

    const state = controller.getState();

    expect(state.servers.map((server) => server.id)).toEqual(['one']);
    expect(state.selectedId).toBe('one');
    expect(state.railVisible).toBe(true);
  });

  test('a server added later becomes the selected one', async () => {
    const { controller } = create();

    await controller.add(startServer('one', 'One'));
    await controller.add(startServer('two', 'Two'));

    expect(controller.getState().selectedId).toBe('two');
  });

  test('the views follow the visibility of the server list', async () => {
    const { controller, calls } = create();

    await controller.add(startServer('one', 'One'));
    expect(calls.layouts.at(-1)?.railVisible).toBe(true);

    controller.setRailHidden(true);
    expect(calls.layouts.at(-1)?.railVisible).toBe(false);

    controller.setRailHidden(false);
    expect(calls.layouts.at(-1)?.railVisible).toBe(true);
  });

  test('the server list can be hidden and shown again', async () => {
    const { controller } = create();

    await controller.add(startServer('one', 'One'));

    controller.setRailHidden(true);
    expect(controller.getState().railVisible).toBe(false);

    controller.setRailHidden(false);
    expect(controller.getState().railVisible).toBe(true);
  });

  test('a hidden server list shows while the selected server does not match the app', async () => {
    const { controller, calls } = create();

    await controller.add(startServer('one', 'One'));
    controller.setRailHidden(true);

    calls.statuses.one = 'server-outdated';
    controller.notify();

    expect(controller.getState().railVisible).toBe(true);
    expect(calls.layouts.at(-1)?.railVisible).toBe(true);
  });

  test('a hidden server list hides again once the selected server matches', async () => {
    const { controller, calls } = create();

    await controller.add(startServer('one', 'One'));
    controller.setRailHidden(true);

    calls.statuses.one = 'app-outdated';
    controller.notify();

    calls.statuses.one = 'connected';
    controller.notify();

    expect(controller.getState().railVisible).toBe(false);
    expect(calls.layouts.at(-1)?.railVisible).toBe(false);
  });

  test('a hidden server list stays hidden when more servers are added', async () => {
    const { controller } = create();

    await controller.add(startServer('one', 'One'));
    controller.setRailHidden(true);
    await controller.add(startServer('two', 'Two'));

    expect(controller.getState().railVisible).toBe(false);
  });

  test('a hidden server list stays hidden after a restart', async () => {
    const first = create();

    await first.controller.add(startServer('one', 'One'));
    first.controller.setRailHidden(true);

    const second = create();

    expect(second.controller.getState().railVisible).toBe(false);
  });

  test('a visible server list stays visible after a restart', async () => {
    const first = create();

    await first.controller.add(startServer('one', 'One'));

    const second = create();

    expect(second.controller.getState().railVisible).toBe(true);
  });

  test('there is no server list after the last server is removed', async () => {
    const { controller } = create();

    await controller.add(startServer('one', 'One'));
    controller.remove('one');

    expect(controller.getState().railVisible).toBe(false);
  });

  test('the first server added after a fresh start shows the list even if it was hidden before', async () => {
    const first = create();

    await first.controller.add(startServer('one', 'One'));
    first.controller.setRailHidden(true);
    first.controller.remove('one');

    const second = create();

    await second.controller.add(startServer('two', 'Two'));

    expect(second.controller.getState().railVisible).toBe(true);
  });

  test('the shell fills the window on a first start and while adding a server', async () => {
    const { controller, calls } = create();

    controller.sync();
    expect(calls.layouts.at(-1)?.fullShell).toBe(true);

    await controller.add(startServer('one', 'One'));
    expect(calls.layouts.at(-1)?.fullShell).toBe(false);

    controller.setAdding(true);
    expect(calls.layouts.at(-1)?.fullShell).toBe(true);

    controller.setAdding(false);
    expect(calls.layouts.at(-1)?.fullShell).toBe(false);
  });

  test('the shell grows over the server while a menu is open and shrinks back after', async () => {
    const { controller, calls } = create();

    await controller.add(startServer('one', 'One'));

    controller.setOverlay(true);
    expect(calls.layouts.at(-1)).toEqual({
      railVisible: true,
      fullShell: true
    });

    controller.setOverlay(false);
    expect(calls.layouts.at(-1)).toEqual({
      railVisible: true,
      fullShell: false
    });
  });

  test('opening a menu does not touch the selected server', async () => {
    const { controller, calls } = create();

    await controller.add(startServer('one', 'One'));

    const shownBefore = calls.shown.length;
    const hiddenBefore = calls.hidden;

    controller.setOverlay(true);

    expect(calls.shown).toHaveLength(shownBefore);
    expect(calls.hidden).toBe(hiddenBefore);
  });

  test('opening the add screen hides the server views and cancelling restores the server', async () => {
    const { controller, calls } = create();

    await controller.add(startServer('one', 'One'));

    const hiddenBefore = calls.hidden;
    controller.setAdding(true);

    expect(controller.getState().adding).toBe(true);
    expect(calls.hidden).toBe(hiddenBefore + 1);

    controller.setAdding(false);

    expect(controller.getState().adding).toBe(false);
    expect(calls.shown.at(-1)).toBe('one');
  });

  test('adding a server leaves the add screen on the new server', async () => {
    const { controller, calls } = create();

    await controller.add(startServer('one', 'One'));
    controller.setAdding(true);
    await controller.add(startServer('two', 'Two'));

    expect(controller.getState().adding).toBe(false);
    expect(calls.shown.at(-1)).toBe('two');
  });

  test('selecting a server shows it and leaves the add screen', async () => {
    const { controller, calls } = create();

    await controller.add(startServer('one', 'One'));
    await controller.add(startServer('two', 'Two'));
    controller.setAdding(true);
    controller.select('one');

    expect(controller.getState().selectedId).toBe('one');
    expect(controller.getState().adding).toBe(false);
    expect(calls.shown.at(-1)).toBe('one');
  });

  test('selecting an unknown server changes nothing', async () => {
    const { controller } = create();

    await controller.add(startServer('one', 'One'));
    controller.select('missing');

    expect(controller.getState().selectedId).toBe('one');
  });

  test('removing the selected server selects another and closes its view', async () => {
    const { controller, calls } = create();

    await controller.add(startServer('one', 'One'));
    await controller.add(startServer('two', 'Two'));
    controller.remove('two');

    expect(calls.removed).toEqual(['two']);
    expect(controller.getState().selectedId).toBe('one');
  });

  test('removing the last server returns to the first start screen', async () => {
    const { controller } = create();

    await controller.add(startServer('one', 'One'));
    controller.remove('one');

    const state = controller.getState();

    expect(state.servers).toEqual([]);
    expect(state.selectedId).toBeNull();
  });

  test('rejects an address that is not valid', async () => {
    const { controller } = create();

    expect(await controller.add('ftp://nope')).toBe('invalid-url');
    expect(controller.getState().servers).toEqual([]);
  });

  test('rejects an address where no server answers', async () => {
    const { controller } = create();
    const origin = startServer('one', 'One');

    await stubs[0]?.stop(true);

    expect(await controller.add(origin)).toBe('unreachable');
    expect(controller.getState().servers).toEqual([]);
  });

  test('rejects a server that was already added', async () => {
    const { controller } = create();
    const origin = startServer('one', 'One');

    await controller.add(origin);

    expect(await controller.add(origin)).toBe('duplicate');
    expect(controller.getState().servers).toHaveLength(1);
  });

  test('servers and the default server come back after a restart', async () => {
    const first = create();

    await first.controller.add(startServer('one', 'One'));
    await first.controller.add(startServer('two', 'Two'));

    const second = create();
    const state = second.controller.getState();

    expect(state.servers.map((server) => server.id)).toEqual(['one', 'two']);
    expect(state.selectedId).toBe('two');
  });

  test('the last selected server is selected again after a restart', async () => {
    const first = create();

    await first.controller.add(startServer('one', 'One'));
    await first.controller.add(startServer('two', 'Two'));
    first.controller.select('one');

    const second = create();

    expect(second.controller.getState().selectedId).toBe('one');
  });

  test('the server selected after a removal is selected again after a restart', async () => {
    const first = create();

    await first.controller.add(startServer('one', 'One'));
    await first.controller.add(startServer('two', 'Two'));
    first.controller.remove('two');

    const second = create();

    expect(second.controller.getState().selectedId).toBe('one');
  });

  test('a saved selection of a server that no longer exists falls back to the first server', async () => {
    const first = create();

    await first.controller.add(startServer('one', 'One'));

    const saved = JSON.parse(readFileSync(filePath, 'utf8'));

    writeFileSync(filePath, JSON.stringify({ ...saved, selectedId: 'gone' }));

    const second = create();

    expect(second.controller.getState().selectedId).toBe('one');
  });

  test('a server renamed after it was added shows its new name after a restart', async () => {
    const first = create();

    await first.controller.add(startServer('one', 'Old name'));
    names.set('one', 'New name');

    const second = create();

    await waitFor(() =>
      states.some((state) => state.servers[0]?.name === 'New name')
    );

    expect(second.controller.getState().servers[0]?.name).toBe('New name');
  });

  test('every change is announced with the new state', async () => {
    const { controller } = create();

    await controller.add(startServer('one', 'One'));
    controller.setAdding(true);

    expect(states.at(-1)).toEqual(controller.getState());
  });
});
