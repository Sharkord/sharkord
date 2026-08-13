import { ChannelPermission } from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import {
  channelUserCan,
  getAffectedUserIdsForChannel,
  getChannelsForUser
} from '../queries/channels';

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

  test('should let a user level deny beat the role grant', async () => {
    expect(await channelUserCan(5, 2, ChannelPermission.VIEW_CHANNEL)).toBe(
      false
    );
    expect(await channelUserCan(5, 3, ChannelPermission.VIEW_CHANNEL)).toBe(
      true
    );
  });
});

describe('getChannelsForUser', () => {
  test('should hide a denied channel even though the role grants it', async () => {
    const visible = await getChannelsForUser(2);

    expect(visible.map((channel) => channel.id)).not.toContain(5);
  });

  test('should not list dm channels the owner is not part of', async () => {
    const visible = await getChannelsForUser(1);
    const ids = visible.map((channel) => channel.id);

    // channelUserCan refuses the owner every action in channel 3, so listing it would
    // render a channel that answers FORBIDDEN to everything
    expect(ids).not.toContain(3);
    expect(ids).toContain(5);
  });
});

describe('getAffectedUserIdsForChannel', () => {
  test('should not publish to a user the role grants but the channel denies', async () => {
    const affected = await getAffectedUserIdsForChannel(5, {
      permission: ChannelPermission.VIEW_CHANNEL
    });

    // user 3 holds the same granting role and is not denied, so the grant itself works
    expect(affected).toContain(3);
    expect(affected).not.toContain(2);
  });

  test('should keep the owner regardless of a deny', async () => {
    const affected = await getAffectedUserIdsForChannel(5, {
      permission: ChannelPermission.VIEW_CHANNEL
    });

    expect(affected).toContain(1);
  });
});
