import {
  FileSaveType,
  imageExtensions,
  type TJoinedEmoji
} from '@sharkord/shared';
import path from 'path';
import { getEmojiById, getUniqueEmojiName } from '../../db/queries/emojis';
import { getPublicUserById } from '../../db/queries/users';
import { deleteEmoji, insertEmojis } from '../../helpers/emojis';
import { fileManager } from '../../helpers/file-manager';
import { invariant } from '../../utils/invariant';

const EMOJI_NAME_MAX_LENGTH = 32;

type TCreatePluginEmoji = {
  name: string;
  fileName: string;
  data: Uint8Array;
  userId: number;
};

const createPluginEmoji = async (
  pluginId: string,
  { name, fileName, data, userId }: TCreatePluginEmoji
): Promise<TJoinedEmoji> => {
  invariant(name.length > 0 && name.length <= EMOJI_NAME_MAX_LENGTH, {
    code: 'BAD_REQUEST',
    message: `Emoji names must be between 1 and ${EMOJI_NAME_MAX_LENGTH} characters.`
  });

  const extension = path.extname(fileName).toLowerCase();

  invariant(imageExtensions.includes(extension), {
    code: 'BAD_REQUEST',
    message: 'An emoji must be an image.'
  });

  const user = await getPublicUserById(userId);

  invariant(user, {
    code: 'NOT_FOUND',
    message: 'User not found'
  });

  const file = await fileManager.savePluginFile(
    pluginId,
    fileName,
    data,
    FileSaveType.EMOJI
  );

  const [emoji] = insertEmojis(
    [{ name: await getUniqueEmojiName(name), fileId: file.id }],
    userId,
    null
  );

  const created = emoji ? await getEmojiById(emoji.id) : undefined;

  invariant(created, {
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Emoji not found after creating it.'
  });

  return created;
};

const deletePluginEmoji = (emojiId: number) => deleteEmoji(emojiId, null);

export { createPluginEmoji, deletePluginEmoji };
export type { TCreatePluginEmoji };
