import { Permission } from '@sharkord/shared';
import { VoiceRuntime } from '../runtimes/voice';
import { invariant } from '../utils/invariant';
import type { Context } from '../utils/trpc';

const getCurrentVoiceRuntime = async (ctx: Context) => {
  await ctx.needsPermission(Permission.JOIN_VOICE_CHANNELS);

  invariant(ctx.currentVoiceChannelId, {
    code: 'BAD_REQUEST',
    message: 'User is not in a voice channel'
  });

  const runtime = VoiceRuntime.findById(ctx.currentVoiceChannelId);

  invariant(runtime, {
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Voice runtime not found for this channel'
  });

  return { runtime, channelId: ctx.currentVoiceChannelId };
};

export { getCurrentVoiceRuntime };
