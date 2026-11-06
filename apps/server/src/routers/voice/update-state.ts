import { ChannelPermission, RateLimiter, ServerEvents } from '@sharkord/shared';
import { z } from 'zod';
import { publishVoicePresence } from '../../db/publishers';
import { channelUserCan } from '../../db/queries/channels';
import { getCurrentVoiceRuntime } from '../../helpers/get-current-voice-runtime';
import { VoiceRuntime } from '../../runtimes/voice';
import { invariant } from '../../utils/invariant';
import { protectedProcedure } from '../../utils/trpc';

const updateVoiceStateRoute = protectedProcedure
  .meta({
    rateLimit: RateLimiter.VOICE_STATE
  })
  .input(
    z.object({
      micMuted: z.boolean().optional(),
      soundMuted: z.boolean().optional(),
      webcamEnabled: z.boolean().optional(),
      sharingScreen: z.boolean().optional()
    })
  )
  .mutation(async ({ input, ctx }) => {
    const { runtime, channelId } = await getCurrentVoiceRuntime(ctx);

    const validatedInput = { ...input };

    const [canSpeak, canUseWebcam, canShareScreen] = await Promise.all([
      channelUserCan(channelId, ctx.user.id, ChannelPermission.SPEAK, {
        ignoreView: true
      }),
      channelUserCan(channelId, ctx.user.id, ChannelPermission.WEBCAM, {
        ignoreView: true
      }),
      channelUserCan(channelId, ctx.user.id, ChannelPermission.SHARE_SCREEN, {
        ignoreView: true
      })
    ]);

    if (!canSpeak) {
      delete validatedInput.micMuted;
    }

    if (!canUseWebcam) {
      delete validatedInput.webcamEnabled;
    }

    if (!canShareScreen) {
      delete validatedInput.sharingScreen;
    }

    invariant(
      validatedInput.micMuted !== false ||
        !VoiceRuntime.isServerMuted(ctx.user.id),
      {
        code: 'FORBIDDEN',
        message: 'You were muted by a moderator.'
      }
    );

    runtime.updateUserState(ctx.user.id, {
      ...validatedInput
    });

    const newState = runtime.getUserState(ctx.user.id);

    await publishVoicePresence(runtime, ServerEvents.USER_VOICE_STATE_UPDATE, {
      channelId: channelId,
      userId: ctx.user.id,
      state: newState
    });
  });

export { updateVoiceStateRoute };
