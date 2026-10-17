import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import type { TServer, TServersState } from '../../../shared/types';
import type { TServerViews } from '../../views/server-views';
import { createServerController } from '../server-controller';

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
    layouts: [] as { railVisible: boolean; fullShell: boolean }[]
  };

  const views = {
    show: (server: TServer) => calls.shown.push(server.id),
    hideAll: () => calls.hidden++,
    remove: (id: string) => calls.removed.push(id),
    setLayout: (layout: { railVisible: boolean; fullShell: boolean }) =>
      calls.layouts.push(layout)
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
      railVisible: false
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
    expect(state.selectedId).toBe('one');
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
