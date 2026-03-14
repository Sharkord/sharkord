import type { TDirectMessageConversation } from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';

// stub localStorage before importing the slice, which reads it at module init time
const store: Record<string, string> = {};
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    }
  }
});

// imported after the stub is in place
const { appSlice } = await import('../slice');
const { addDmConversation, updateDmConversationLastMessage } = appSlice.actions;

// helper -- build a minimal conversation object
const conv = (
  channelId: number,
  userId: number,
  lastMessageAt: number
): TDirectMessageConversation => ({
  channelId,
  userId,
  unreadCount: 0,
  lastMessageAt
});

// helper -- run the reducer from the default empty state
const reduce = (...actions: ReturnType<typeof addDmConversation>[]) => {
  let state = appSlice.getInitialState();

  for (const action of actions) {
    state = appSlice.reducer(state, action);
  }

  return state.dmConversations;
};

describe('addDmConversation', () => {
  test('adds a new conversation to an empty list', () => {
    const result = reduce(addDmConversation(conv(1, 2, 1000)));

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ channelId: 1, userId: 2 });
  });

  test('appends a second conversation', () => {
    const result = reduce(
      addDmConversation(conv(1, 2, 1000)),
      addDmConversation(conv(2, 3, 2000))
    );

    expect(result).toHaveLength(2);
  });

  test('upserts -- replaces an existing conversation rather than duplicating it', () => {
    const updated = conv(1, 2, 9999);
    const result = reduce(
      addDmConversation(conv(1, 2, 1000)),
      addDmConversation(updated)
    );

    expect(result).toHaveLength(1);
    expect(result[0]!.lastMessageAt).toBe(9999);
  });

  test('sorts by lastMessageAt descending -- most recent first', () => {
    const result = reduce(
      addDmConversation(conv(1, 2, 1000)),
      addDmConversation(conv(2, 3, 3000)),
      addDmConversation(conv(3, 4, 2000))
    );

    expect(result.map((c) => c.channelId)).toEqual([2, 3, 1]);
  });

  test('upsert re-sorts when lastMessageAt changes', () => {
    // start with conv 2 most recent
    const after = reduce(
      addDmConversation(conv(1, 2, 1000)),
      addDmConversation(conv(2, 3, 3000))
    );

    expect(after[0]!.channelId).toBe(2);

    // now update conv 1 with a newer timestamp -- should move to top
    let state = appSlice.getInitialState();
    state = appSlice.reducer(state, addDmConversation(conv(1, 2, 1000)));
    state = appSlice.reducer(state, addDmConversation(conv(2, 3, 3000)));
    state = appSlice.reducer(state, addDmConversation(conv(1, 2, 5000)));

    expect(state.dmConversations[0]!.channelId).toBe(1);
    expect(state.dmConversations[1]!.channelId).toBe(2);
  });
});

describe('updateDmConversationLastMessage', () => {
  test('updates lastMessageAt and re-sorts to the top', () => {
    let state = appSlice.getInitialState();
    state = appSlice.reducer(state, addDmConversation(conv(1, 2, 1000)));
    state = appSlice.reducer(state, addDmConversation(conv(2, 3, 3000)));

    // conv 2 is on top
    expect(state.dmConversations[0]!.channelId).toBe(2);

    // new message in conv 1 -- should move it to the top
    state = appSlice.reducer(
      state,
      updateDmConversationLastMessage({ channelId: 1, lastMessageAt: 5000 })
    );

    expect(state.dmConversations[0]!.channelId).toBe(1);
    expect(state.dmConversations[0]!.lastMessageAt).toBe(5000);
    expect(state.dmConversations[1]!.channelId).toBe(2);
  });

  test('does nothing if the channelId is not in the list', () => {
    let state = appSlice.getInitialState();
    state = appSlice.reducer(state, addDmConversation(conv(1, 2, 1000)));

    state = appSlice.reducer(
      state,
      updateDmConversationLastMessage({ channelId: 99, lastMessageAt: 9999 })
    );

    expect(state.dmConversations).toHaveLength(1);
    expect(state.dmConversations[0]!.lastMessageAt).toBe(1000);
  });
});
