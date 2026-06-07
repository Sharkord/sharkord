import { ChannelPermission } from '@sharkord/shared';
import { assertDmChannel } from '../db/queries/dms';
import type { Context } from '../utils/trpc';

const assertChannelAccess = async (
  ctx: Context,
  channelId: number
): Promise<void> => {
  await Promise.all([
    assertDmChannel(channelId, ctx.userId),
    ctx.needsChannelPermission(channelId, ChannelPermission.VIEW_CHANNEL)
  ]);
};

export { assertChannelAccess };
