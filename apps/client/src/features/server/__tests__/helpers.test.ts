import {
  ChannelPermission,
  type TChannelUserPermissionsMap,
  type TJoinedMessage
} from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import { canViewChannel, mergeMessagesChronologically } from '../helpers';

const message = (id: number, createdAt: number) =>
  ({ id, createdAt }) as TJoinedMessage;

const ids = (messages: TJoinedMessage[]) => messages.map((m) => m.id);

describe('mergeMessagesChronologically', () => {
  test('should return the existing list untouched when nothing arrives', () => {
    const existing = [message(1, 10)];

    expect(mergeMessagesChronologically(existing, [])).toBe(existing);
  });

  test('should sort an unordered first page', () => {
    const merged = mergeMessagesChronologically(
      [],
      [message(3, 30), message(1, 10), message(2, 20)]
    );

    expect(ids(merged)).toEqual([1, 2, 3]);
  });

  test('should append a page that is entirely newer', () => {
    const merged = mergeMessagesChronologically(
      [message(1, 10), message(2, 20)],
      [message(3, 30), message(4, 40)]
    );

    expect(ids(merged)).toEqual([1, 2, 3, 4]);
  });

  // paging upwards, which is the case the ordering exists for
  test('should prepend a page that is entirely older', () => {
    const merged = mergeMessagesChronologically(
      [message(3, 30), message(4, 40)],
      [message(1, 10), message(2, 20)]
    );

    expect(ids(merged)).toEqual([1, 2, 3, 4]);
  });

  // a jump lands a window in the middle of what is already held
  test('should interleave a page that overlaps the middle', () => {
    const merged = mergeMessagesChronologically(
      [message(1, 10), message(5, 50)],
      [message(2, 20), message(3, 30)]
    );

    expect(ids(merged)).toEqual([1, 2, 3, 5]);
  });

  // two messages can share a timestamp, and the id is the only stable tiebreak left
  test('should break equal timestamps by id', () => {
    const merged = mergeMessagesChronologically(
      [message(7, 10)],
      [message(2, 10), message(9, 10)]
    );

    expect(ids(merged)).toEqual([2, 7, 9]);
  });

  test('should keep every message when both sides are non empty', () => {
    const merged = mergeMessagesChronologically(
      [message(1, 10), message(3, 30), message(5, 50)],
      [message(2, 20), message(4, 40), message(6, 60)]
    );

    expect(ids(merged)).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe('canViewChannel', () => {
  const permissions = (channelId: number, allow: boolean) =>
    ({
      [channelId]: {
        permissions: { [ChannelPermission.VIEW_CHANNEL]: allow }
      }
    }) as unknown as TChannelUserPermissionsMap;

  const publicChannel = { id: 1, private: false };
  const privateChannel = { id: 2, private: true };

  test('should allow the owner everywhere', () => {
    expect(canViewChannel(privateChannel, permissions(2, false), true)).toBe(
      true
    );
  });

  test('should allow any public channel', () => {
    expect(canViewChannel(publicChannel, permissions(1, false), false)).toBe(
      true
    );
  });

  test('should allow a private channel the permission map grants', () => {
    expect(canViewChannel(privateChannel, permissions(2, true), false)).toBe(
      true
    );
  });

  test('should refuse a private channel with no entry at all', () => {
    expect(
      canViewChannel(privateChannel, {} as TChannelUserPermissionsMap, false)
    ).toBe(false);
  });

  test('should refuse a private channel the map denies', () => {
    expect(canViewChannel(privateChannel, permissions(2, false), false)).toBe(
      false
    );
  });

  // being in the call outranks the permission: this is what keeps a moved user's channel
  // visible for as long as they are speaking in it
  test('should allow the channel the user is currently in a call in', () => {
    expect(
      canViewChannel(privateChannel, permissions(2, false), false, 2)
    ).toBe(true);
  });

  test('should not extend that to a different channel', () => {
    expect(
      canViewChannel(privateChannel, permissions(2, false), false, 9)
    ).toBe(false);
  });
});
