import type { TTempFile } from '@sharkord/shared';
import { beforeEach, describe, expect, test } from 'bun:test';
import fs from 'fs/promises';
import { initTest, login, uploadFile } from '../../__tests__/helpers';
import { fileManager } from '../../helpers/file-manager';

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
    const fileOnlyMessageId = await caller.messages.send({
      channelId: 1,
      content: '',
      files: [tempFile.id]
    });

    const replyId = await caller.messages.send({
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

    const parentId = await caller.messages.send({
      channelId: 1,
      content: 'Thread parent',
      files: []
    });

    const threadReplyId = await caller.messages.send({
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
