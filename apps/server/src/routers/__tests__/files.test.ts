import {
  ChannelPermission,
  FILE_TOKEN_REFRESH_GRACE_MS,
  FILE_TOKEN_REFRESH_MAX_FILES,
  type TTempFile
} from '@sharkord/shared';
import { beforeEach, describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import fs from 'fs/promises';
import {
  initTest,
  login,
  sendMessage,
  uploadFile
} from '../../__tests__/helpers';
import { tdb } from '../../__tests__/setup';
import { getSettings } from '../../db/queries/server';
import { channels, channelUserPermissions, settings } from '../../db/schema';
import { fileManager } from '../../helpers/file-manager';
import { generateFileToken, verifyFileToken } from '../../helpers/files-crypto';

describe('files router', () => {
  let tempFile: TTempFile;
  let counter = 0;

  beforeEach(async () => {
    const response = await login('testowner', 'password123');
    const data: any = await response.json();

    const res = await uploadFile(
      new File(['test'], `file-${counter++}.txt`, { type: 'text/plain' }),
      data.token
    );

    tempFile = (await res.json()) as TTempFile;
  });

  test('should clean up inline replies when removing the last file deletes the message', async () => {
    const { caller } = await initTest();

    // a file only message: removing its file removes the message itself
    const fileOnlyMessageId = await sendMessage(caller, {
      channelId: 1,
      content: '',
      files: [tempFile.id]
    });

    const replyId = await sendMessage(caller, {
      channelId: 1,
      content: 'Replying to the file message',
      files: [],
      replyToMessageId: fileOnlyMessageId
    });

    const message = await caller.messages.getOne({
      messageId: fileOnlyMessageId
    });

    expect(message.files.length).toBe(1);

    await caller.files.delete({ fileId: message.files[0]!.id });

    await expect(
      caller.messages.getOne({ messageId: fileOnlyMessageId })
    ).rejects.toThrow('Message not found');

    // the same cleanup messages.delete performs, this path used to skip it
    const reply = await caller.messages.getOne({ messageId: replyId });

    expect(reply.replyToMessageId).toBeNull();
    expect(reply.replyTo).toBeNull();
  });

  test('should update the parent reply count when a thread reply loses its last file', async () => {
    const { caller } = await initTest();

    const parentId = await sendMessage(caller, {
      channelId: 1,
      content: 'Thread parent',
      files: []
    });

    const threadReplyId = await sendMessage(caller, {
      channelId: 1,
      content: '',
      files: [tempFile.id],
      parentMessageId: parentId
    });

    const reply = await caller.messages.getOne({ messageId: threadReplyId });

    await caller.files.delete({ fileId: reply.files[0]!.id });

    const parent = await caller.messages.getOne({ messageId: parentId });

    expect(parent.replyCount).toBe(0);
  });

  test('should check temporary file existence', async () => {
    expect(tempFile).toBeDefined();
    expect(tempFile.id).toBeDefined();

    const file = await fileManager.getTemporaryFile(tempFile.id);

    expect(file).toBeDefined();
    expect(file?.path).toBe(tempFile.path);
    expect(file?.originalName).toBe(tempFile.originalName);
    expect(file?.size).toBe(tempFile.size);

    const stat = await fs.stat(tempFile.path);

    expect(stat.size).toBe(tempFile.size);
  });

  test('should delete a temporary file', async () => {
    const { caller } = await initTest();

    expect(await fs.exists(tempFile.path)).toBe(true);

    await caller.files.deleteTemporary({
      fileId: tempFile.id
    });

    expect(await fs.exists(tempFile.path)).toBe(false);
  });

  test('should throw when deleting a non-existent temporary file', async () => {
    const { caller } = await initTest();

    await expect(
      caller.files.deleteTemporary({
        fileId: '<non-existent-file-id>' // non-existent file ID
      })
    ).rejects.toThrow('Temporary file not found');
  });

  test('should throw when deleting other users temporary file', async () => {
    const { caller } = await initTest(2);

    await expect(
      caller.files.deleteTemporary({
        fileId: tempFile.id
      })
    ).rejects.toThrow(
      'You do not have permission to delete this temporary file'
    );

    expect(await fs.exists(tempFile.path)).toBe(true);
  });
});

describe('files.refreshTokens', () => {
  // seeded attachment in General, which every member can see
  const fileId = 1;
  // seeded attachment in the dm between users 3 and 4
  const dmFileId = 2;
  // no row attaches it to a message, the way avatars, banners and emojis are stored
  const unattachedFileId = 99;

  const signedFileById = (id: number, expiresAt: number) => ({
    id,
    token: generateFileToken(id, expiresAt),
    expiresAt
  });

  const signedFile = (expiresAt: number) => signedFileById(fileId, expiresAt);

  beforeEach(async () => {
    await tdb.update(settings).set({
      storageSignedUrlsEnabled: true,
      storageSignedUrlsTtlSeconds: 3600
    });

    // loads the server secret the tokens are signed with
    await getSettings();
  });

  test('should exchange a valid token for a fresh one', async () => {
    const { caller } = await initTest(2);
    const before = Date.now();

    const [refreshed] = await caller.files.refreshTokens({
      files: [signedFile(before + 60_000)]
    });

    expect(refreshed!.id).toBe(fileId);
    expect(refreshed!.expiresAt).toBeGreaterThanOrEqual(before + 3600_000);
    expect(
      verifyFileToken(fileId, refreshed!.token, refreshed!.expiresAt)
    ).toBe(true);
  });

  test('should refresh a token that expired within the grace window', async () => {
    const { caller } = await initTest(2);

    const refreshed = await caller.files.refreshTokens({
      files: [signedFile(Date.now() - 60_000)]
    });

    expect(refreshed.length).toBe(1);
  });

  test('should drop a token that expired past the grace window', async () => {
    const { caller } = await initTest(2);

    const refreshed = await caller.files.refreshTokens({
      files: [signedFile(Date.now() - FILE_TOKEN_REFRESH_GRACE_MS - 60_000)]
    });

    expect(refreshed).toEqual([]);
  });

  test('should drop a token with an invalid signature', async () => {
    const { caller } = await initTest(2);
    const expiresAt = Date.now() + 60_000;

    const refreshed = await caller.files.refreshTokens({
      files: [
        {
          id: fileId + 1,
          token: generateFileToken(fileId, expiresAt),
          expiresAt
        },
        { ...signedFile(expiresAt), expiresAt: expiresAt + 1 }
      ]
    });

    expect(refreshed).toEqual([]);
  });

  test('should return nothing when signed urls are disabled', async () => {
    const { caller } = await initTest(2);

    await tdb.update(settings).set({ storageSignedUrlsEnabled: false });

    const refreshed = await caller.files.refreshTokens({
      files: [signedFile(Date.now() + 60_000)]
    });

    expect(refreshed).toEqual([]);
  });

  test('should drop an attachment from a channel the caller cannot see', async () => {
    const { caller } = await initTest(2);

    const refreshed = await caller.files.refreshTokens({
      files: [signedFileById(dmFileId, Date.now() + 60_000)]
    });

    expect(refreshed).toEqual([]);
  });

  test('should refresh an attachment for a member of its channel', async () => {
    const { caller } = await initTest(3);

    const refreshed = await caller.files.refreshTokens({
      files: [signedFileById(dmFileId, Date.now() + 60_000)]
    });

    expect(refreshed.map(({ id }) => id)).toEqual([dmFileId]);
  });

  test('should keep the visible files of a batch and drop the hidden ones', async () => {
    const { caller } = await initTest(2);
    const expiresAt = Date.now() + 60_000;

    const refreshed = await caller.files.refreshTokens({
      files: [
        signedFileById(fileId, expiresAt),
        signedFileById(dmFileId, expiresAt),
        signedFileById(unattachedFileId, expiresAt)
      ]
    });

    expect(refreshed.map(({ id }) => id)).toEqual([fileId, unattachedFileId]);
  });

  test('should stop refreshing an attachment once the caller loses access to its channel', async () => {
    const { caller } = await initTest(2);
    const file = signedFileById(fileId, Date.now() + 60_000);

    expect(await caller.files.refreshTokens({ files: [file] })).toHaveLength(1);

    await tdb.update(channels).set({ private: true }).where(eq(channels.id, 1));
    await tdb.insert(channelUserPermissions).values({
      channelId: 1,
      userId: 2,
      permission: ChannelPermission.VIEW_CHANNEL,
      allow: false,
      createdAt: Date.now()
    });

    expect(await caller.files.refreshTokens({ files: [file] })).toEqual([]);
  });

  test('should reject more files than the limit', async () => {
    const { caller } = await initTest(2);
    const file = signedFile(Date.now() + 60_000);

    await expect(
      caller.files.refreshTokens({
        files: Array.from(
          { length: FILE_TOKEN_REFRESH_MAX_FILES + 1 },
          () => file
        )
      })
    ).rejects.toThrow();
  });
});
