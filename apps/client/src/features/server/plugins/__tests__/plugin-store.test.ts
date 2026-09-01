import type { IRootState } from '@/features/store';
import { describe, expect, test } from 'bun:test';
import { mapStateToPluginState } from '../../selectors';

// the slices keep their identity between dispatches in the real store, so the
// fixture has to as well or the memoization has nothing to hit on
const SLICES = {
  users: [],
  channels: [],
  categories: [],
  roles: [],
  emojis: [],
  pluginsMetadata: [],
  ownUserId: 1,
  selectedChannelId: 1,
  currentVoiceChannelId: undefined,
  publicSettings: undefined
};

const stateWith = (overrides: Record<string, unknown> = {}) =>
  ({ server: { ...SLICES, ...overrides } }) as unknown as IRootState;

describe('mapStateToPluginState', () => {
  // plugins read state through getState, and the standard react integration
  // re-renders forever unless the snapshot keeps its identity between calls
  test('should return the same snapshot while nothing has changed', () => {
    const state = stateWith();

    expect(mapStateToPluginState(state)).toBe(mapStateToPluginState(state));
  });

  test('should keep its identity when an unrelated part of state changes', () => {
    const before = mapStateToPluginState(stateWith());

    // connected is not part of what a plugin sees
    const after = mapStateToPluginState(stateWith({ connected: true }));

    expect(after).toBe(before);
  });

  test('should return a new snapshot once something it exposes changes', () => {
    const before = mapStateToPluginState(stateWith());
    const after = mapStateToPluginState(stateWith({ selectedChannelId: 42 }));

    expect(after).not.toBe(before);
    expect(after.selectedChannelId).toBe(42);
  });

  test('should expose exactly the documented keys', () => {
    expect(Object.keys(mapStateToPluginState(stateWith())).sort()).toEqual([
      'categories',
      'channels',
      'currentVoiceChannelId',
      'emojis',
      'ownUserId',
      'plugins',
      'publicSettings',
      'roles',
      'selectedChannelId',
      'users'
    ]);
  });
});
