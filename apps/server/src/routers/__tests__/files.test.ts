import type { TTempFile } from '@sharkord/shared';
import { beforeEach, describe, expect, test } from 'bun:test';
import fs from 'fs/promises';
import { initTest, login, uploadFile } from '../../__tests__/helpers';
import { fileManager } from '../../utils/file-manager';

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

  test('should check temporary file existence', async () => {
    expect(tempFile).toBeDefined();
    expect(tempFile.id).toBeDefined();

    const file = await fileManager.getTemporaryFile(tempFile.id);

    expect(file).toBeDefined();
    expect(file?.originalName).toBe(tempFile.originalName);
    expect(file?.size).toBe(tempFile.size);

    const stat = await fs.stat(file!.tempPath);

    expect(stat.size).toBe(tempFile.size);
  });

  test('should delete a temporary file', async () => {
    const { caller } = await initTest();

    const file = fileManager.getTemporaryFile(tempFile.id);

    expect(await fs.exists(file!.tempPath)).toBe(true);

    await caller.files.deleteTemporary({
      fileId: tempFile.id
    });

    expect(await fs.exists(file!.tempPath)).toBe(false);
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

    const file = fileManager.getTemporaryFile(tempFile.id);

    expect(await fs.exists(file!.tempPath)).toBe(true);
  });
});
