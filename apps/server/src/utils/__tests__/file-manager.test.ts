import { StorageOverflowAction, type TTempFile } from '@sharkord/shared';
import { beforeEach, describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import fs from 'fs/promises';
import { afterEach } from 'node:test';
import path from 'path';
import { tdb } from '../../__tests__/setup';
import { files, settings } from '../../db/schema';
import { PUBLIC_PATH, TMP_PATH, UPLOADS_PATH } from '../../helpers/paths';
import { fileManager } from '../file-manager';
import { config } from '../../config';
import { createReadStream } from 'fs';
import { pipeline } from 'stream/promises';

async function moveFileIntoTempFile(filePath: string, tempFile: TTempFile) {
  // This writes the filePath into the tempFile's filestream, in the same way an incoming file would
  await pipeline(
      createReadStream(filePath),
      tempFile.fileStream,
    )
  await fs.unlink(filePath);
}

describe('file manager', () => {
  const tempFilesToCleanup: string[] = [];
  let testFilePath: string;
  let testFileName: string;

  beforeEach(async () => {
    const content = 'test file content';

    testFileName = `test-${Date.now()}.txt`;
    testFilePath = path.join(UPLOADS_PATH, testFileName);

    await fs.writeFile(testFilePath, content);
  });

  afterEach(async () => {
    const toDelete = [...tempFilesToCleanup, testFilePath];

    for (const filePath of toDelete) {
      try {
        await fs.unlink(filePath);
      } catch {
        // ignore
      }
    }

    tempFilesToCleanup.length = 0;
  });

  test('should add temporary file and return metadata', async () => {
    const stats = await fs.stat(testFilePath);

    const tempFile = await fileManager.initTemporaryFile({
      size: stats.size,
      originalName: testFileName,
      userId: 1
    });

    await moveFileIntoTempFile(testFilePath, tempFile);

    await fileManager.finishTemporaryFile(tempFile);

    tempFilesToCleanup.push(tempFile.tempPath);

    expect(tempFile).toBeDefined();
    expect(tempFile.id).toBeDefined();
    expect(tempFile.originalName).toBe(testFileName);
    expect(tempFile.extension).toBe('.txt');
    expect(tempFile.size).toBe(stats.size);
    expect(tempFile.md5).toBeDefined();
    expect(tempFile.userId).toBe(1);
    expect(tempFile.tempPath).toContain(TMP_PATH);
    expect(tempFile.tempPath).toContain(tempFile.id);

    expect(await fs.exists(tempFile.tempPath)).toBe(true);
  });

  test('should retrieve temporary file by id', async () => {
    const stats = await fs.stat(testFilePath);

    const tempFile = await fileManager.initTemporaryFile({
      size: stats.size,
      originalName: testFileName,
      userId: 1
    });

    await moveFileIntoTempFile(testFilePath, tempFile);

    await fileManager.finishTemporaryFile(tempFile);

    tempFilesToCleanup.push(tempFile.tempPath);

    const retrieved = fileManager.getTemporaryFile(tempFile.id);

    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(tempFile.id);
    expect(retrieved?.originalName).toBe(testFileName);
  });

  test('should return undefined for non-existent temporary file', () => {
    const retrieved = fileManager.getTemporaryFile('non-existent-id');

    expect(retrieved).toBeUndefined();
  });

  test('should remove temporary file from manager and filesystem', async () => {
    const stats = await fs.stat(testFilePath);

    const tempFile = await fileManager.initTemporaryFile({
      size: stats.size,
      originalName: testFileName,
      userId: 1
    });

    await moveFileIntoTempFile(testFilePath, tempFile);

    await fileManager.finishTemporaryFile(tempFile);

    expect(await fs.exists(tempFile.tempPath)).toBe(true);

    expect(fileManager.getTemporaryFile(tempFile.id)).toBeDefined();

    await fileManager.removeTemporaryFile(tempFile.id);

    expect(fileManager.getTemporaryFile(tempFile.id)).toBeUndefined();

    expect(await fs.exists(tempFile.tempPath)).toBe(false);
  });

  test('should throw error for non-existent temporary file', async () => {
    await expect(
      fileManager.removeTemporaryFile('non-existent-id')
    ).rejects.toThrow('Temporary file not found');
  });

  test('should generate unique file IDs', async () => {
    const file1Name = `unique1-${Date.now()}.txt`;
    const file2Name = `unique2-${Date.now()}.txt`;

    const testFile1 = path.join(UPLOADS_PATH, file1Name);
    const testFile2 = path.join(UPLOADS_PATH, file2Name);

    await fs.writeFile(testFile1, 'content 1');
    await fs.writeFile(testFile2, 'content 2');

    const stats1 = await fs.stat(testFile1);
    const stats2 = await fs.stat(testFile2);

    const tempFile1 = await fileManager.initTemporaryFile({
      size: stats1.size,
      originalName: file1Name,
      userId: 1
    });
    const tempFile2 = await fileManager.initTemporaryFile({
      size: stats2.size,
      originalName: file2Name,
      userId: 1
    });

    await moveFileIntoTempFile(testFile1, tempFile1);
    await moveFileIntoTempFile(testFile2, tempFile2);

    await fileManager.finishTemporaryFile(tempFile1);
    await fileManager.finishTemporaryFile(tempFile2);

    tempFilesToCleanup.push(testFilePath, tempFile1.tempPath, tempFile2.tempPath);

    expect(tempFile1.id).not.toBe(tempFile2.id);
  });

  test('should calculate correct MD5 hash', async () => {
    const stats = await fs.stat(testFilePath);

    const tempFile = await fileManager.initTemporaryFile({
      size: stats.size,
      originalName: testFileName,
      userId: 1
    });

    await moveFileIntoTempFile(testFilePath, tempFile);

    await fileManager.finishTemporaryFile(tempFile);

    tempFilesToCleanup.push(tempFile.tempPath);

    expect(tempFile.md5).toBeDefined();
    expect(tempFile.md5).toHaveLength(32);
  });

  test('should save temporary file to public directory', async () => {
    const stats = await fs.stat(testFilePath);

    const tempFile = await fileManager.initTemporaryFile({
      size: stats.size,
      originalName: testFileName,
      userId: 1
    });

    await moveFileIntoTempFile(testFilePath, tempFile);

    await fileManager.finishTemporaryFile(tempFile);

    const [savedFile, fileProcessing] = fileManager.saveFile(tempFile.id, 1);

    const processedFile = await fileProcessing;

    tempFilesToCleanup.push(tempFile.publicPath);

    expect(savedFile).toBeDefined();
    expect(savedFile.id).toBeGreaterThan(0);
    expect(savedFile.uuid).toBe(tempFile.id);
    expect(savedFile.originalName).toBe(testFileName);
    expect(savedFile.extension).toBe('.txt');
    expect(savedFile.userId).toBe(1);
    expect(savedFile.mimeType).toContain('text/plain');
    expect(savedFile.createdAt).toBeGreaterThan(0);
    expect(processedFile).toBeDefined();
    expect(processedFile.compressed).toBeBoolean();
    expect(processedFile.size).toBeInteger();
    expect(processedFile.md5).toBeString();
    if (processedFile.compressed) {
      expect(processedFile.size).toBeLessThan(stats.size);
    } else {
      expect(processedFile.size).toBe(stats.size);
    }

    expect(await fs.exists(tempFile.publicPath)).toBe(true);
    expect(await fs.exists(tempFile.tempPath)).toBe(false);

    expect(fileManager.getTemporaryFile(tempFile.id)).toBeUndefined();
  });

  test('should save file with correct content', async () => {
    config.storage.gzipCompression = false; // ensure no compression
    const content = 'specific test content';
    const fileName = `test-content-${Date.now()}.txt`;
    const filePath = path.join(UPLOADS_PATH, fileName);
    await fs.writeFile(filePath, content);
    const stats = await fs.stat(filePath);

    const tempFile = await fileManager.initTemporaryFile({
      size: stats.size,
      originalName: fileName,
      userId: 1
    });

    await moveFileIntoTempFile(filePath, tempFile);

    await fileManager.finishTemporaryFile(tempFile);

    const [_, fileProcessing] = fileManager.saveFile(tempFile.id, 1);
    await fileProcessing;
    tempFilesToCleanup.push(testFilePath, tempFile.publicPath);

    const savedContent = await fs.readFile(tempFile.publicPath, 'utf-8');
    expect(savedContent).toBe(content);
    config.storage.gzipCompression = true; // re-enable compression
  });

  test('should compress large file', async () => {
    const content = 'a'.repeat(100);
    const filePath = path.join(UPLOADS_PATH, `test-content-${Date.now()}.txt`);
    await fs.writeFile(filePath, content);
    const stats = await fs.stat(filePath);

    const tempFile = await fileManager.initTemporaryFile({
      size: stats.size,
      originalName: testFileName,
      userId: 1
    });

    await moveFileIntoTempFile(filePath, tempFile);

    await fileManager.finishTemporaryFile(tempFile);

    const [savedFile, fileProcessing] = fileManager.saveFile(tempFile.id, 1);
    const processedFile = await fileProcessing;
    tempFilesToCleanup.push(testFilePath, tempFile.publicPath);
    const postProcessingStats = await fs.stat(tempFile.publicPath);

    expect(processedFile.compressed).toBe(true);
    expect(stats.size).toBeGreaterThan(postProcessingStats.size);
  });

  test('should insert file record in database', async () => {
    const stats = await fs.stat(testFilePath);

    const tempFile = await fileManager.initTemporaryFile({
      size: stats.size,
      originalName: testFileName,
      userId: 1
    });

    await moveFileIntoTempFile(testFilePath, tempFile);

    await fileManager.finishTemporaryFile(tempFile);

    const [savedFile, fileProcessing] = fileManager.saveFile(tempFile.id, 1);
    await fileProcessing;

    tempFilesToCleanup.push(tempFile.publicPath);

    const dbFile = await tdb
      .select()
      .from(files)
      .where(eq(files.id, savedFile.id))
      .get();

    expect(dbFile).toBeDefined();
    expect(dbFile?.uuid).toBe(savedFile.uuid);
    expect(dbFile?.originalName).toBe(testFileName);
    expect(dbFile?.userId).toBe(1);
    expect(dbFile?.size).toBe(stats.size);
    expect(dbFile?.mimeType).toInclude('text/plain');
  });

  test('should throw error when saving non-existent temporary file', async () => {
    expect(() => fileManager.saveFile('non-existent-id', 1)).toThrow(
      'File not found'
    );
  });

  test('should throw not found error when user does not own temporary file', async () => {
    const stats = await fs.stat(testFilePath);

    const tempFile = await fileManager.initTemporaryFile({
      size: stats.size,
      originalName: testFileName,
      userId: 1
    });

    await moveFileIntoTempFile(testFilePath, tempFile);

    await fileManager.finishTemporaryFile(tempFile);

    const [_, fileProcessing] = fileManager.saveFile(tempFile.id, 1);
    await fileProcessing;

    tempFilesToCleanup.push(tempFile.tempPath);

    expect(() => fileManager.saveFile(tempFile.id, 999)).toThrow(
      "File not found"
    );
  });

  test('should generate sequential file IDs', async () => {
    const file1Name = `sequential1-${Date.now()}.txt`;
    const file2Name = `sequential2-${Date.now()}.txt`;
    const testFile1 = path.join(UPLOADS_PATH, file1Name);
    const testFile2 = path.join(UPLOADS_PATH, file2Name);

    await fs.writeFile(testFile1, 'content 1');
    await fs.writeFile(testFile2, 'content 2');

    const stats1 = await fs.stat(testFile1);
    const stats2 = await fs.stat(testFile2);

    const tempFile1 = await fileManager.initTemporaryFile({
      size: stats1.size,
      originalName: file1Name,
      userId: 1
    });

    await moveFileIntoTempFile(testFile1, tempFile1);

    await fileManager.finishTemporaryFile(tempFile1);

    const [savedFile1, fileProcessing1] = fileManager.saveFile(tempFile1.id, 1);
    await fileProcessing1;

    const tempFile2 = await fileManager.initTemporaryFile({
      size: stats2.size,
      originalName: file2Name,
      userId: 1
    });

    await moveFileIntoTempFile(testFile2, tempFile2);

    await fileManager.finishTemporaryFile(tempFile2);

    const [savedFile2, fileProcessing2] = fileManager.saveFile(tempFile2.id, 1);
    await fileProcessing2;

    tempFilesToCleanup.push(
      path.join(tempFile1.publicPath),
      path.join(tempFile2.publicPath)
    );

    expect(savedFile2.id).toBeGreaterThan(savedFile1.id);
  });

  test('should throw error when user storage limit exceeded', async () => {
    await tdb.update(settings).set({ storageSpaceQuotaByUser: 10 }).execute();

    const content = 'content that exceeds limit';
    const fileName = `large-${Date.now()}.txt`;
    const filePath = path.join(UPLOADS_PATH, fileName);
    await fs.writeFile(filePath, content);
    const stats = await fs.stat(filePath);

    const tempFile = await fileManager.initTemporaryFile({
      size: stats.size,
      originalName: fileName,
      userId: 1
    });

    await moveFileIntoTempFile(filePath, tempFile);

    await fileManager.finishTemporaryFile(tempFile);

    tempFilesToCleanup.push(testFilePath, tempFile.tempPath);

    const [_, fileProcessing] = fileManager.saveFile(tempFile.id, 1);

    expect(fileProcessing).rejects.toThrow(
      'User storage limit exceeded'
    );

    await tdb.update(settings).set({ storageSpaceQuotaByUser: 0 }).execute();
  });

  test('should throw error when server storage limit exceeded with PREVENT_UPLOADS', async () => {
    await tdb
      .update(settings)
      .set({
        storageQuota: 10,
        storageOverflowAction: StorageOverflowAction.PREVENT_UPLOADS
      })
      .execute();

    const content = 'content that exceeds limit';
    const fileName = `large-${Date.now()}.txt`;
    const filePath = path.join(UPLOADS_PATH, fileName);
    await fs.writeFile(filePath, content);
    const stats = await fs.stat(filePath);

    const tempFile = await fileManager.initTemporaryFile({
      size: stats.size,
      originalName: fileName,
      userId: 1
    });

    await moveFileIntoTempFile(filePath, tempFile);

    await fileManager.finishTemporaryFile(tempFile);

    tempFilesToCleanup.push(testFilePath, tempFile.tempPath);

    const [_, fileProcessing] = fileManager.saveFile(tempFile.id, 1)

    expect(fileProcessing).rejects.toThrow(
      'Server storage limit exceeded.'
    );

    await tdb
      .update(settings)
      .set({
        storageQuota: 0,
        storageOverflowAction: StorageOverflowAction.PREVENT_UPLOADS
      })
      .execute();
  });

  test('should delete old files when storage limit exceeded with DELETE_OLD_FILES', async () => {
    const oldFileName = `old-${Date.now()}.txt`;
    const newFileName = `new-${Date.now()}.txt`;
    const oldFilePath = path.join(UPLOADS_PATH, oldFileName);

    await fs.writeFile(oldFilePath, 'old content');

    const oldStats = await fs.stat(oldFilePath);

    const oldTempFile = await fileManager.initTemporaryFile({
      size: oldStats.size,
      originalName: oldFileName,
      userId: 1
    });

    await moveFileIntoTempFile(oldFilePath, oldTempFile);

    await fileManager.finishTemporaryFile(oldTempFile);

    const [oldSavedFile, oldFileProcessing] = fileManager.saveFile(oldTempFile.id, 1);
    const oldFileProcessed = await oldFileProcessing;

    await Bun.sleep(100); // ensure different timestamps

    const totalLimit = (oldFileProcessed.size!) + 5;

    await tdb.update(settings).set({
      storageQuota: totalLimit,
      storageUploadMaxFileSize: totalLimit,
      storageOverflowAction: StorageOverflowAction.DELETE_OLD_FILES
    });

    const newFilePath = path.join(UPLOADS_PATH, newFileName);

    await fs.writeFile(newFilePath, 'new content here');

    const newStats = await fs.stat(newFilePath);

    const newTempFile = await fileManager.initTemporaryFile({
      size: newStats.size,
      originalName: newFileName,
      userId: 1
    });

    await moveFileIntoTempFile(newFilePath, newTempFile);

    await fileManager.finishTemporaryFile(newTempFile);

    const [newSavedFile, newFileProcessing] = fileManager.saveFile(newTempFile.id, 1);
    await newFileProcessing;

    tempFilesToCleanup.push(testFilePath, newTempFile.publicPath);

    const oldDbFile = await tdb
      .select()
      .from(files)
      .where(eq(files.id, oldSavedFile.id))
      .get();

    expect(oldDbFile).toBeUndefined();

    const newDbFile = await tdb
      .select()
      .from(files)
      .where(eq(files.id, newSavedFile.id))
      .get();

    expect(newDbFile).toBeDefined();
  });

  test('should allow save when storage limits are disabled', async () => {
    await tdb
      .update(settings)
      .set({
        storageQuota: 0,
        storageSpaceQuotaByUser: 0
      })
      .execute();

    const stats = await fs.stat(testFilePath);

    const tempFile = await fileManager.initTemporaryFile({
      size: stats.size,
      originalName: testFileName,
      userId: 1
    });

    await moveFileIntoTempFile(testFilePath, tempFile);

    await fileManager.finishTemporaryFile(tempFile);

    const [savedFile, fileProcessing] = fileManager.saveFile(tempFile.id, 1);
    await fileProcessing;

    tempFilesToCleanup.push(tempFile.publicPath);

    expect(savedFile).toBeDefined();
    expect(savedFile.id).toBeGreaterThan(0);
  });


  test('should have different uuid but same original name for duplicate file names', async () => {
    const fileAPath = path.join(UPLOADS_PATH, `dup-${Date.now()}.txt`);

    await fs.writeFile(fileAPath, 'first');

    const statsA = await fs.stat(fileAPath);

    const tempA = await fileManager.initTemporaryFile({
      size: statsA.size,
      originalName: 'my-file.txt',
      userId: 1
    });

    await moveFileIntoTempFile(fileAPath, tempA);

    await fileManager.finishTemporaryFile(tempA);

    const [savedA, fileProcessingA] = fileManager.saveFile(tempA.id, 1);
    await fileProcessingA;



    const fileBPath = path.join(UPLOADS_PATH, `dup2-${Date.now()}.txt`);

    await fs.writeFile(fileBPath, 'second');

    const statsB = await fs.stat(fileBPath);

    const tempB = await fileManager.initTemporaryFile({
      size: statsB.size,
      originalName: 'my-file.txt',
      userId: 1
    });

    await moveFileIntoTempFile(fileBPath, tempB);

    await fileManager.finishTemporaryFile(tempB);

    const [savedB, fileProcessingB] = fileManager.saveFile(tempB.id, 1);
    await fileProcessingB;

    tempFilesToCleanup.push(testFilePath, tempA.publicPath, tempB.publicPath);

    expect(savedA.originalName).toBe('my-file.txt');
    expect(savedB.originalName).toBe('my-file.txt');
    expect(savedA.uuid).not.toBe(savedB.uuid);

    const dbA = await tdb
      .select()
      .from(files)
      .where(eq(files.id, savedA.id))
      .get();

    const dbB = await tdb
      .select()
      .from(files)
      .where(eq(files.id, savedB.id))
      .get();

    expect(dbA).toBeDefined();
    expect(dbA?.originalName).toBe('my-file.txt');
    expect(dbB).toBeDefined();
    expect(dbB?.originalName).toBe('my-file.txt');
    expect(dbA?.uuid).not.toBe(dbB?.uuid);
  });

  test('temporaryFileExists returns correct boolean', async () => {
    const tmpPath = path.join(UPLOADS_PATH, `exists-${Date.now()}.txt`);

    await fs.writeFile(tmpPath, 'exists');

    const stats = await fs.stat(tmpPath);

    const temp = await fileManager.initTemporaryFile({
      size: stats.size,
      originalName: 'my-file.txt',
      userId: 1
    });

    await moveFileIntoTempFile(tmpPath, temp);

    await fileManager.finishTemporaryFile(temp);

    tempFilesToCleanup.push(temp.tempPath);

    expect(fileManager.temporaryFileExists(temp.id)).toBe(true);

    await fileManager.removeTemporaryFile(temp.id);

    expect(fileManager.temporaryFileExists(temp.id)).toBe(false);
  });

});
