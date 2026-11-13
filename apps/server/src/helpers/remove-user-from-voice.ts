import { ServerEvents } from '@sharkord/shared';
import {
  publishVoicePresence,
  unpublishHiddenChannelFromUser
} from '../db/publishers';
import type { VoiceRuntime } from '../runtimes/voice';

const removeUserFromVoice = async (runtime: VoiceRuntime, userId: number) => {
  runtime.removeUser(userId);

  await publishVoicePresence(runtime, ServerEvents.USER_LEAVE_VOICE, {
    channelId: runtime.id,
    userId
  });

  await unpublishHiddenChannelFromUser(userId, runtime.id);
};

export { removeUserFromVoice };
