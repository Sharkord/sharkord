import { EMOJI_CHARACTER_REGEX, EMOJI_SHORTCODE_REGEX } from '@sharkord/shared';
import { getEmojiFileIdByEmojiName } from '../db/queries/emojis';
import { invariant } from '../utils/invariant';

const resolveKnownEmojiFileId = async (
  emoji: string
): Promise<number | null> => {
  const emojiFileId = await getEmojiFileIdByEmojiName(emoji);

  invariant(
    emojiFileId !== null ||
      EMOJI_CHARACTER_REGEX.test(emoji) ||
      EMOJI_SHORTCODE_REGEX.test(emoji),
    {
      code: 'BAD_REQUEST',
      message: 'Unknown emoji'
    }
  );

  return emojiFileId;
};

export { resolveKnownEmojiFileId };
