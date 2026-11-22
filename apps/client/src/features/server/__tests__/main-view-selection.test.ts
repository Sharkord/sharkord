import { describe, expect, test } from 'bun:test';
import { serverSliceActions, serverSliceReducer } from '../slice';

type TState = ReturnType<typeof serverSliceReducer>;

const openers = {
  channel: serverSliceActions.setSelectedChannelId(5),
  dms: serverSliceActions.setDmsOpen(true),
  threads: serverSliceActions.setThreadsOpen(true),
  page: serverSliceActions.setActiveFullscreenPluginId({
    pluginId: 'plugin-a',
    pageId: 'supporters'
  })
};

type TView = keyof typeof openers;

const openViews = (state: TState): TView[] => {
  const open: TView[] = [];

  if (state.selectedChannelId !== undefined) open.push('channel');
  if (state.dmsOpen) open.push('dms');
  if (state.threadsOpen) open.push('threads');
  if (state.activeFullscreenPluginId !== undefined) open.push('page');

  return open;
};

const views = Object.keys(openers) as TView[];
const initial = serverSliceReducer(undefined, { type: 'init' });

describe('main view selection', () => {
  // every pair, so no view can be left selected behind another one
  for (const first of views) {
    for (const second of views) {
      if (first === second) continue;

      test(`opening ${second} after ${first} leaves only ${second} open`, () => {
        const afterFirst = serverSliceReducer(initial, openers[first]);
        const afterSecond = serverSliceReducer(afterFirst, openers[second]);

        expect(openViews(afterSecond)).toEqual([second]);
      });
    }
  }

  test('opening a page keeps its page id and clears it again on the next view', () => {
    const onPage = serverSliceReducer(initial, openers.page);

    expect(onPage.activePluginPageId).toBe('supporters');

    const onThreads = serverSliceReducer(onPage, openers.threads);

    expect(onThreads.activePluginPageId).toBeUndefined();
  });

  // closing one view never opens another, the main view is left empty
  test('closing a view leaves nothing selected', () => {
    const onThreads = serverSliceReducer(initial, openers.threads);
    const closed = serverSliceReducer(
      onThreads,
      serverSliceActions.setThreadsOpen(false)
    );

    expect(openViews(closed)).toEqual([]);
  });
});
