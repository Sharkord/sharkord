import { ChannelPermission } from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import { channelUserCan } from '../queries/channels';

describe('channelUserCan', () => {
  test('should grant everything in a public channel', async () => {
    expect(await channelUserCan(1, 2, ChannelPermission.SEND_MESSAGES)).toBe(
      true
    );
  });

  test('should grant a dm channel to its participants', async () => {
    expect(await channelUserCan(3, 3, ChannelPermission.VIEW_CHANNEL)).toBe(
      true
    );
    expect(await channelUserCan(3, 4, ChannelPermission.SEND_MESSAGES)).toBe(
      true
    );
  });

  test('should refuse a dm channel to a non participant, including the owner', async () => {
    expect(await channelUserCan(3, 2, ChannelPermission.VIEW_CHANNEL)).toBe(
      false
    );
    expect(await channelUserCan(3, 1, ChannelPermission.VIEW_CHANNEL)).toBe(
      false
    );
  });

  test('should refuse a private channel with no permissions granted', async () => {
    expect(await channelUserCan(4, 2, ChannelPermission.VIEW_CHANNEL)).toBe(
      false
    );
  });

  test('should grant a private channel to the owner', async () => {
    expect(await channelUserCan(4, 1, ChannelPermission.JOIN)).toBe(true);
  });

  test('should refuse a channel that does not exist', async () => {
    expect(await channelUserCan(9999, 1, ChannelPermission.VIEW_CHANNEL)).toBe(
      false
    );
  });
});
