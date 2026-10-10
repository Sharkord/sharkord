import { REACTION_EMOJI_MAX_LENGTH, ServerEvents } from '@sharkord/shared';
import { getPluginVoiceRuntime } from '../../helpers/get-plugin-voice-runtime';
import { resolveKnownEmojiFileId } from '../../helpers/resolve-known-emoji-file-id';
import { invariant } from '../../utils/invariant';
import { pubsub } from '../../utils/pubsub';

// the same event a user's own reaction publishes, so it floats on their card
// with nothing to say a plugin sent it
const sendPluginVoiceReaction = async (
  channelId: number,
  userId: number,
  emoji: string
) => {
  const runtime = getPluginVoiceRuntime(channelId);

  invariant(runtime.getUser(userId), {
    code: 'NOT_FOUND',
    message: 'User is not in this voice channel.'
  });

  invariant(emoji.length > 0 && emoji.length <= REACTION_EMOJI_MAX_LENGTH, {
    code: 'BAD_REQUEST',
    message: `Emoji must be between 1 and ${REACTION_EMOJI_MAX_LENGTH} characters.`
  });

  await resolveKnownEmojiFileId(emoji);

  pubsub.publish(ServerEvents.USER_VOICE_REACTION, {
    channelId,
    userId,
    emoji
  });
};

export { sendPluginVoiceReaction };
