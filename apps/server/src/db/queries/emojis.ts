import type { TJoinedEmoji } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { db } from '..';
import { attachFileToken } from '../../helpers/files-crypto';
import { emojis, files, users } from '../schema';
import { getSettings } from './server';

const emojiSelectFields = {
  emoji: emojis,
  file: files,
  user: {
    id: users.id,
    name: users.name,
    bannerColor: users.bannerColor,
    bio: users.bio,
    createdAt: users.createdAt,
    banned: users.banned,
    avatarId: users.avatarId,
    bannerId: users.bannerId
  }
};

type TEmojiRow = Awaited<ReturnType<typeof getEmojiRows>>[number];

const getEmojiRows = () =>
  db
    .select(emojiSelectFields)
    .from(emojis)
    .innerJoin(files, eq(emojis.fileId, files.id))
    .innerJoin(users, eq(emojis.userId, users.id));

const parseEmoji = (
  row: TEmojiRow,
  signedUrlsEnabled: boolean,
  signedUrlsTtlSeconds: number
): TJoinedEmoji => ({
  ...row.emoji,
  file: attachFileToken(row.file, signedUrlsEnabled, signedUrlsTtlSeconds),
  user: { ...row.user, avatar: null, banner: null }
});

const getEmojiById = async (id: number): Promise<TJoinedEmoji | undefined> => {
  const row = await getEmojiRows().where(eq(emojis.id, id)).limit(1).get();

  if (!row) return undefined;

  const { storageSignedUrlsEnabled, storageSignedUrlsTtlSeconds } =
    await getSettings();

  return parseEmoji(row, storageSignedUrlsEnabled, storageSignedUrlsTtlSeconds);
};

const getEmojis = async (): Promise<TJoinedEmoji[]> => {
  const rows = await getEmojiRows();

  const { storageSignedUrlsEnabled, storageSignedUrlsTtlSeconds } =
    await getSettings();

  return rows.map((row) =>
    parseEmoji(row, storageSignedUrlsEnabled, storageSignedUrlsTtlSeconds)
  );
};

const emojiExists = async (name: string): Promise<boolean> => {
  const emoji = await db
    .select()
    .from(emojis)
    .where(eq(emojis.name, name))
    .limit(1)
    .get();

  return !!emoji;
};

const getUniqueEmojiName = async (baseName: string): Promise<string> => {
  const MAX_LENGTH = 24;
  let normalizedBase = baseName.toLowerCase().replace(/\s+/g, '_');

  if (normalizedBase.length > MAX_LENGTH - 3) {
    normalizedBase = normalizedBase.substring(0, MAX_LENGTH - 3);
  }

  let emojiName = normalizedBase.substring(0, MAX_LENGTH);
  let counter = 1;

  while (await emojiExists(emojiName)) {
    const suffix = `_${counter}`;
    const maxBaseLength = MAX_LENGTH - suffix.length;
    emojiName = `${normalizedBase.substring(0, maxBaseLength)}${suffix}`;
    counter++;
  }

  return emojiName;
};

const getEmojiFileIdByEmojiName = async (
  name: string
): Promise<number | null> => {
  const result = await db
    .select({
      fileId: emojis.fileId
    })
    .from(emojis)
    .where(eq(emojis.name, name))
    .get();

  return result ? result.fileId : null;
};

export {
  emojiExists,
  getEmojiById,
  getEmojiFileIdByEmojiName,
  getEmojis,
  getUniqueEmojiName
};
