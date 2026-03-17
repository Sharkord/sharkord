import { FileSaveType, StorageOverflowAction } from '@sharkord/shared';
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';
import { tdb } from '../../__tests__/setup';
import { files, settings } from '../../db/schema';
import { PUBLIC_PATH, TMP_PATH, UPLOADS_PATH } from '../../helpers/paths';
import { pluginManager } from '../../plugins';
import { fileManager } from '../file-manager';

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

    const tempFile = await fileManager.addTemporaryFile({
      filePath: testFilePath,
      size: stats.size,
      originalName: testFileName,
      userId: 1
    });

    tempFilesToCleanup.push(tempFile.path);

    expect(tempFile).toBeDefined();
    expect(tempFile.id).toBeDefined();
    expect(tempFile.originalName).toBe(testFileName);
    expect(tempFile.extension).toBe('.txt');
    expect(tempFile.size).toBe(stats.size);
    expect(tempFile.md5).toBeDefined();
    expect(tempFile.userId).toBe(1);
    expect(tempFile.path).toContain(TMP_PATH);
    expect(tempFile.path).toContain(tempFile.id);

    expect(await fs.exists(tempFile.path)).toBe(true);
  });

  test('should retrieve temporary file by id', async () => {
    const stats = await fs.stat(testFilePath);

    const tempFile = await fileManager.addTemporaryFile({
      filePath: testFilePath,
      size: stats.size,
      originalName: testFileName,
      userId: 1
    });

    tempFilesToCleanup.push(tempFile.path);

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

    const tempFile = await fileManager.addTemporaryFile({
      filePath: testFilePath,
      size: stats.size,
      originalName: testFileName,
      userId: 1
    });

    expect(await fs.exists(tempFile.path)).toBe(true);

    expect(fileManager.getTemporaryFile(tempFile.id)).toBeDefined();

    await fileManager.removeTemporaryFile(tempFile.id);

    expect(fileManager.getTemporaryFile(tempFile.id)).toBeUndefined();

    expect(await fs.exists(tempFile.path)).toBe(false);
  });

  test('should throw error for non-existent temporary file', async () => {
    await expect(
      fileManager.removeTemporaryFile('non-existent-id')
    ).rejects.toThrow('Temporary file not found');
  });

  test('should generate unique temporary file IDs', async () => {
    const file1Name = `unique1-${Date.now()}.txt`;
    const file2Name = `unique2-${Date.now()}.txt`;

    const testFile1 = path.join(UPLOADS_PATH, file1Name);
    const testFile2 = path.join(UPLOADS_PATH, file2Name);

    await fs.writeFile(testFile1, 'content 1');
    await fs.writeFile(testFile2, 'content 2');

    const stats1 = await fs.stat(testFile1);
    const stats2 = await fs.stat(testFile2);

    const tempFile1 = await fileManager.addTemporaryFile({
      filePath: testFile1,
      size: stats1.size,
      originalName: file1Name,
      userId: 1
    });

    const tempFile2 = await fileManager.addTemporaryFile({
      filePath: testFile2,
      size: stats2.size,
      originalName: file2Name,
      userId: 1
    });

    tempFilesToCleanup.push(tempFile1.path, tempFile2.path);

    expect(tempFile1.id).not.toBe(tempFile2.id);
  });

  test('should calculate correct MD5 hash', async () => {
    const stats = await fs.stat(testFilePath);

    const tempFile = await fileManager.addTemporaryFile({
      filePath: testFilePath,
      size: stats.size,
      originalName: testFileName,
      userId: 1
    });

    tempFilesToCleanup.push(tempFile.path);

    expect(tempFile.md5).toBeDefined();
    expect(tempFile.md5).toHaveLength(32);
  });

  test('should save temporary file to public directory', async () => {
    const stats = await fs.stat(testFilePath);

    const tempFile = await fileManager.addTemporaryFile({
      filePath: testFilePath,
      size: stats.size,
      originalName: testFileName,
      userId: 1
    });

    const savedFile = await fileManager.saveFile(tempFile.id, 1);

    tempFilesToCleanup.push(path.join(PUBLIC_PATH, savedFile.name));

    expect(savedFile).toBeDefined();
    expect(savedFile.id).toBeGreaterThan(0);
    expect(savedFile.name).toBe(testFileName);
    expect(savedFile.originalName).toBe(testFileName);
    expect(savedFile.extension).toBe('.txt');
    expect(savedFile.size).toBe(stats.size);
    expect(savedFile.userId).toBe(1);
    expect(savedFile.mimeType).toContain('text/plain');
    expect(savedFile.createdAt).toBeGreaterThan(0);

    const publicPath = path.join(PUBLIC_PATH, savedFile.name);

    expect(await fs.exists(publicPath)).toBe(true);
    expect(await fs.exists(tempFile.path)).toBe(false);

    expect(fileManager.getTemporaryFile(tempFile.id)).toBeUndefined();
  });

  test('should save file with correct content', async () => {
    const content = 'specific test content';
    const filePath = path.join(UPLOADS_PATH, `test-content-${Date.now()}.txt`);
    await fs.writeFile(filePath, content);
    const stats = await fs.stat(filePath);

    const tempFile = await fileManager.addTemporaryFile({
      filePath,
      size: stats.size,
      originalName: testFileName,
      userId: 1
    });

    const savedFile = await fileManager.saveFile(tempFile.id, 1);
    tempFilesToCleanup.push(path.join(PUBLIC_PATH, savedFile.name));

    const publicPath = path.join(PUBLIC_PATH, savedFile.name);
    const savedContent = await fs.readFile(publicPath, 'utf-8');
    expect(savedContent).toBe(content);
  });

  test('should insert file record in database', async () => {
    const stats = await fs.stat(testFilePath);

    const tempFile = await fileManager.addTemporaryFile({
      filePath: testFilePath,
      size: stats.size,
      originalName: testFileName,
      userId: 1
    });

    const savedFile = await fileManager.saveFile(tempFile.id, 1);

    tempFilesToCleanup.push(path.join(PUBLIC_PATH, savedFile.name));

    const dbFile = await tdb
      .select()
      .from(files)
      .where(eq(files.id, savedFile.id))
      .get();

    expect(dbFile).toBeDefined();
    expect(dbFile?.name).toBe(savedFile.name);
    expect(dbFile?.originalName).toBe(testFileName);
    expect(dbFile?.userId).toBe(1);
    expect(dbFile?.size).toBe(stats.size);
    expect(dbFile?.mimeType).toInclude('text/plain');
  });

  test('should throw error when saving non-existent temporary file', async () => {
    await expect(fileManager.saveFile('non-existent-id', 1)).rejects.toThrow(
      'File not found'
    );
  });

  test('should throw error when user does not own temporary file', async () => {
    const stats = await fs.stat(testFilePath);

    const tempFile = await fileManager.addTemporaryFile({
      filePath: testFilePath,
      size: stats.size,
      originalName: testFileName,
      userId: 1
    });

    tempFilesToCleanup.push(tempFile.path);

    await expect(fileManager.saveFile(tempFile.id, 999)).rejects.toThrow(
      "You don't have permission to access this file"
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

    const tempFile1 = await fileManager.addTemporaryFile({
      filePath: testFile1,
      size: stats1.size,
      originalName: file1Name,
      userId: 1
    });

    const savedFile1 = await fileManager.saveFile(tempFile1.id, 1);

    const tempFile2 = await fileManager.addTemporaryFile({
      filePath: testFile2,
      size: stats2.size,
      originalName: file2Name,
      userId: 1
    });

    const savedFile2 = await fileManager.saveFile(tempFile2.id, 1);

    tempFilesToCleanup.push(
      path.join(PUBLIC_PATH, savedFile1.name),
      path.join(PUBLIC_PATH, savedFile2.name)
    );

    expect(savedFile2.id).toBeGreaterThan(savedFile1.id);
  });

  test('should throw error when user storage limit exceeded', async () => {
    await tdb.update(settings).set({ storageSpaceQuotaByUser: 10 }).execute();

    const content = 'content that exceeds limit';
    const filePath = path.join(UPLOADS_PATH, `large-${Date.now()}.txt`);
    await fs.writeFile(filePath, content);
    const stats = await fs.stat(filePath);

    const tempFile = await fileManager.addTemporaryFile({
      filePath,
      size: stats.size,
      originalName: 'large.txt',
      userId: 1
    });

    tempFilesToCleanup.push(tempFile.path);

    await expect(fileManager.saveFile(tempFile.id, 1)).rejects.toThrow(
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
    const filePath = path.join(UPLOADS_PATH, `large-${Date.now()}.txt`);
    await fs.writeFile(filePath, content);
    const stats = await fs.stat(filePath);

    const tempFile = await fileManager.addTemporaryFile({
      filePath,
      size: stats.size,
      originalName: 'large.txt',
      userId: 1
    });

    tempFilesToCleanup.push(tempFile.path);

    await expect(fileManager.saveFile(tempFile.id, 1)).rejects.toThrow(
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

    const oldTempFile = await fileManager.addTemporaryFile({
      filePath: oldFilePath,
      size: oldStats.size,
      originalName: oldFileName,
      userId: 1
    });

    const oldSavedFile = await fileManager.saveFile(oldTempFile.id, 1);

    await Bun.sleep(100); // ensure different timestamps

    const totalLimit = oldSavedFile.size + 5;

    await tdb.update(settings).set({
      storageQuota: totalLimit,
      storageUploadMaxFileSize: totalLimit,
      storageOverflowAction: StorageOverflowAction.DELETE_OLD_FILES
    });

    const newFilePath = path.join(UPLOADS_PATH, newFileName);

    await fs.writeFile(newFilePath, 'new content here');

    const newStats = await fs.stat(newFilePath);

    const newTempFile = await fileManager.addTemporaryFile({
      filePath: newFilePath,
      size: newStats.size,
      originalName: newFileName,
      userId: 1
    });

    const newSavedFile = await fileManager.saveFile(newTempFile.id, 1);

    tempFilesToCleanup.push(path.join(PUBLIC_PATH, newSavedFile.name));

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

    const tempFile = await fileManager.addTemporaryFile({
      filePath: testFilePath,
      size: stats.size,
      originalName: testFileName,
      userId: 1
    });

    const savedFile = await fileManager.saveFile(tempFile.id, 1);
    tempFilesToCleanup.push(path.join(PUBLIC_PATH, savedFile.name));

    expect(savedFile).toBeDefined();
    expect(savedFile.id).toBeGreaterThan(0);
  });

  test('should generate safe upload path with correct extension', async () => {
    const path1 = await fileManager.getSafeUploadPath(testFileName);
    const path2 = await fileManager.getSafeUploadPath('another.jpg');

    expect(path1).toContain('.txt');
    expect(path2).toContain('.jpg');
    expect(path1).not.toBe(path2);
  });

  test('should generate unique paths for multiple calls', async () => {
    const path1 = await fileManager.getSafeUploadPath('file.txt');
    const path2 = await fileManager.getSafeUploadPath('file.txt');
    const path3 = await fileManager.getSafeUploadPath('file.txt');

    expect(path1).not.toBe(path2);
    expect(path2).not.toBe(path3);
    expect(path1).not.toBe(path3);
  });

  test('should append counter when same original name already exists', async () => {
    const fileAPath = path.join(UPLOADS_PATH, `dup-${Date.now()}.txt`);

    await fs.writeFile(fileAPath, 'first');

    const statsA = await fs.stat(fileAPath);

    const tempA = await fileManager.addTemporaryFile({
      filePath: fileAPath,
      size: statsA.size,
      originalName: 'my-file.txt',
      userId: 1
    });

    const savedA = await fileManager.saveFile(tempA.id, 1);

    tempFilesToCleanup.push(path.join(PUBLIC_PATH, savedA.name));

    const fileBPath = path.join(UPLOADS_PATH, `dup2-${Date.now()}.txt`);

    await fs.writeFile(fileBPath, 'second');

    const statsB = await fs.stat(fileBPath);

    const tempB = await fileManager.addTemporaryFile({
      filePath: fileBPath,
      size: statsB.size,
      originalName: 'my-file.txt',
      userId: 1
    });

    const savedB = await fileManager.saveFile(tempB.id, 1);

    tempFilesToCleanup.push(path.join(PUBLIC_PATH, savedB.name));

    expect(savedA.name).toBe('my-file.txt');
    expect(savedB.name).toBe('my-file-2.txt');

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
    expect(dbA?.name).toBe('my-file.txt');
    expect(dbB).toBeDefined();
    expect(dbB?.name).toBe('my-file-2.txt');
  });

  test('temporaryFileExists returns correct boolean', async () => {
    const tmpPath = path.join(UPLOADS_PATH, `exists-${Date.now()}.txt`);

    await fs.writeFile(tmpPath, 'exists');

    const stats = await fs.stat(tmpPath);

    const temp = await fileManager.addTemporaryFile({
      filePath: tmpPath,
      size: stats.size,
      originalName: 'exists.txt',
      userId: 1
    });

    tempFilesToCleanup.push(temp.path);

    expect(fileManager.temporaryFileExists(temp.id)).toBe(true);

    await fileManager.removeTemporaryFile(temp.id);

    expect(fileManager.temporaryFileExists(temp.id)).toBe(false);
  });

  test('getSafeUploadPath handles names with no extension', async () => {
    const p = await fileManager.getSafeUploadPath('Makefile');

    expect(p.startsWith(UPLOADS_PATH)).toBe(true);
    expect(path.extname(p)).toBe('');
  });

  test('should normalize uppercase extension to lowercase', async () => {
    const fileName = `photo-${Date.now()}.JPG`;
    const filePath = path.join(UPLOADS_PATH, fileName);

    await fs.writeFile(filePath, 'fake image content');

    const stats = await fs.stat(filePath);

    const tempFile = await fileManager.addTemporaryFile({
      filePath,
      size: stats.size,
      originalName: fileName,
      userId: 1
    });

    tempFilesToCleanup.push(tempFile.path);

    expect(tempFile.extension).toBe('.jpg');
    expect(tempFile.path).toContain('.jpg');
    expect(tempFile.path).not.toContain('.JPG');
  });

  test('should normalize mixed-case extension to lowercase', async () => {
    const fileName = `document-${Date.now()}.Pdf`;
    const filePath = path.join(UPLOADS_PATH, fileName);

    await fs.writeFile(filePath, 'fake pdf content');

    const stats = await fs.stat(filePath);

    const tempFile = await fileManager.addTemporaryFile({
      filePath,
      size: stats.size,
      originalName: fileName,
      userId: 1
    });

    tempFilesToCleanup.push(tempFile.path);

    expect(tempFile.extension).toBe('.pdf');
  });

  test('should save file with lowercase extension in database', async () => {
    const fileName = `image-${Date.now()}.PNG`;
    const filePath = path.join(UPLOADS_PATH, fileName);

    await fs.writeFile(filePath, 'fake png content');

    const stats = await fs.stat(filePath);

    const tempFile = await fileManager.addTemporaryFile({
      filePath,
      size: stats.size,
      originalName: fileName,
      userId: 1
    });

    const savedFile = await fileManager.saveFile(tempFile.id, 1);

    tempFilesToCleanup.push(path.join(PUBLIC_PATH, savedFile.name));

    expect(savedFile.extension).toBe('.png');
    expect(savedFile.name).toEndWith('.png');

    const dbFile = await tdb
      .select()
      .from(files)
      .where(eq(files.id, savedFile.id))
      .get();

    expect(dbFile).toBeDefined();
    expect(dbFile?.extension).toBe('.png');
  });

  test('should generate safe upload path with lowercase extension', async () => {
    const p = await fileManager.getSafeUploadPath('Photo.JPEG');

    expect(p).toContain('.jpeg');
    expect(p).not.toContain('.JPEG');
  });

  test('should handle duplicate names with uppercase extensions', async () => {
    const file1Path = path.join(UPLOADS_PATH, `dup-uc-${Date.now()}.txt`);
    const file2Path = path.join(UPLOADS_PATH, `dup-uc2-${Date.now()}.txt`);

    await fs.writeFile(file1Path, 'first');
    await fs.writeFile(file2Path, 'second');

    const stats1 = await fs.stat(file1Path);
    const stats2 = await fs.stat(file2Path);

    const temp1 = await fileManager.addTemporaryFile({
      filePath: file1Path,
      size: stats1.size,
      originalName: 'report.TXT',
      userId: 1
    });

    const saved1 = await fileManager.saveFile(temp1.id, 1);

    tempFilesToCleanup.push(path.join(PUBLIC_PATH, saved1.name));

    const temp2 = await fileManager.addTemporaryFile({
      filePath: file2Path,
      size: stats2.size,
      originalName: 'report.TXT',
      userId: 1
    });

    const saved2 = await fileManager.saveFile(temp2.id, 1);

    tempFilesToCleanup.push(path.join(PUBLIC_PATH, saved2.name));

    expect(saved1.name).toBe('report.txt');
    expect(saved2.name).toBe('report-2.txt');
  });
});

describe('file manager – beforeFileSave hooks', () => {
  const tempFilesToCleanup: string[] = [];
  let testFilePath: string;
  let testFileName: string;

  beforeEach(async () => {
    pluginManager.clearBeforeFileSaveHooks();

    testFileName = `hook-test-${Date.now()}.txt`;
    testFilePath = path.join(UPLOADS_PATH, testFileName);
    await fs.writeFile(testFilePath, 'hook test content');
  });

  afterEach(async () => {
    pluginManager.clearBeforeFileSaveHooks();

    for (const p of tempFilesToCleanup) {
      try {
        await fs.unlink(p);
      } catch {
        // ignore
      }
    }
    tempFilesToCleanup.length = 0;

    try {
      await fs.unlink(testFilePath);
    } catch {
      // ignore
    }
  });

  const addTempFile = async (content = 'hook test content') => {
    const filePath = path.join(
      UPLOADS_PATH,
      `src-${Date.now()}-${Math.random()}.txt`
    );
    await fs.writeFile(filePath, content);
    const stats = await fs.stat(filePath);
    return fileManager.addTemporaryFile({
      filePath,
      size: stats.size,
      originalName: `test-${Date.now()}.txt`,
      userId: 1
    });
  };

  test('hook is not called when saveFile is called without a type', async () => {
    let hookCalled = false;

    pluginManager.registerBeforeFileSaveHook('test-plugin', async () => {
      hookCalled = true;
    });

    const tempFile = await addTempFile();
    const saved = await fileManager.saveFile(tempFile.id, 1);

    tempFilesToCleanup.push(path.join(PUBLIC_PATH, saved.name));

    expect(hookCalled).toBe(false);
  });

  test('hook is called with correct payload when type is provided', async () => {
    let capturedPayload:
      | Parameters<
          Parameters<typeof pluginManager.registerBeforeFileSaveHook>[1]
        >[0]
      | null = null;

    pluginManager.registerBeforeFileSaveHook('test-plugin', async (payload) => {
      capturedPayload = payload;
    });

    const tempFile = await addTempFile();
    const saved = await fileManager.saveFile(
      tempFile.id,
      1,
      FileSaveType.MESSAGE
    );

    tempFilesToCleanup.push(path.join(PUBLIC_PATH, saved.name));

    expect(capturedPayload).not.toBeNull();
    expect(capturedPayload!.userId).toBe(1);
    expect(capturedPayload!.type).toBe(FileSaveType.MESSAGE);
    expect(capturedPayload!.tempFile.id).toBe(tempFile.id);
    expect(capturedPayload!.tempFile.userId).toBe(1);
  });

  test('hook returning void leaves the file unchanged', async () => {
    pluginManager.registerBeforeFileSaveHook('test-plugin', async () => {
      // return nothing
    });

    const tempFile = await addTempFile('original content');
    const originalMd5 = tempFile.md5;

    const saved = await fileManager.saveFile(
      tempFile.id,
      1,
      FileSaveType.MESSAGE
    );
    tempFilesToCleanup.push(path.join(PUBLIC_PATH, saved.name));

    expect(saved.md5).toBe(originalMd5);

    const content = await fs.readFile(
      path.join(PUBLIC_PATH, saved.name),
      'utf-8'
    );
    expect(content).toBe('original content');
  });

  test('hook returning a new file path replaces the file content and updates metadata', async () => {
    const replacementContent = 'replaced by plugin';
    const replacementPath = path.join(
      TMP_PATH,
      `replacement-${Date.now()}.txt`
    );
    await fs.writeFile(replacementPath, replacementContent);
    // track for cleanup in case of failure
    tempFilesToCleanup.push(replacementPath);

    pluginManager.registerBeforeFileSaveHook('test-plugin', async () => {
      return replacementPath;
    });

    const tempFile = await addTempFile('original content');
    const originalMd5 = tempFile.md5;
    const originalPath = tempFile.path;

    const saved = await fileManager.saveFile(
      tempFile.id,
      1,
      FileSaveType.MESSAGE
    );
    tempFilesToCleanup.push(path.join(PUBLIC_PATH, saved.name));

    // content in public should be the replacement
    const savedContent = await fs.readFile(
      path.join(PUBLIC_PATH, saved.name),
      'utf-8'
    );
    expect(savedContent).toBe(replacementContent);

    // metadata should reflect the replacement
    expect(saved.size).toBe(Buffer.byteLength(replacementContent, 'utf-8'));
    expect(saved.md5).not.toBe(originalMd5);

    // original temp file should have been deleted
    expect(await fs.exists(originalPath)).toBe(false);
    // replacement temp file should also be gone (moved to public)
    expect(await fs.exists(replacementPath)).toBe(false);
  });

  test('hook throwing an error aborts the save and propagates the error', async () => {
    pluginManager.registerBeforeFileSaveHook('test-plugin', async () => {
      throw new Error('rejected by plugin');
    });

    const tempFile = await addTempFile();

    await expect(
      fileManager.saveFile(tempFile.id, 1, FileSaveType.MESSAGE)
    ).rejects.toThrow('rejected by plugin');

    // temp file should still be tracked (save was aborted)
    expect(fileManager.getTemporaryFile(tempFile.id)).toBeDefined();

    // temp file should still exist on disk
    expect(await fs.exists(tempFile.path)).toBe(true);

    // clean up manually
    await fileManager.removeTemporaryFile(tempFile.id);
  });

  test('hook returning a non-existent path throws a wrapped error', async () => {
    pluginManager.registerBeforeFileSaveHook('test-plugin', async () => {
      return path.join(TMP_PATH, 'does-not-exist.txt');
    });

    const tempFile = await addTempFile();

    await expect(
      fileManager.saveFile(tempFile.id, 1, FileSaveType.MESSAGE)
    ).rejects.toThrow('Failed to apply file changes from beforeFileSave hook');

    // clean up
    await fileManager.removeTemporaryFile(tempFile.id);
  });

  test('multiple hooks from different plugins all run in sequence', async () => {
    const callOrder: string[] = [];

    pluginManager.registerBeforeFileSaveHook('plugin-one', async () => {
      callOrder.push('plugin-one');
    });
    pluginManager.registerBeforeFileSaveHook('plugin-two', async () => {
      callOrder.push('plugin-two');
    });

    const tempFile = await addTempFile();
    const saved = await fileManager.saveFile(
      tempFile.id,
      1,
      FileSaveType.AVATAR
    );
    tempFilesToCleanup.push(path.join(PUBLIC_PATH, saved.name));

    expect(callOrder).toEqual(['plugin-one', 'plugin-two']);
  });

  test('multiple hooks from the same plugin all run', async () => {
    const callCount = { n: 0 };

    pluginManager.registerBeforeFileSaveHook('test-plugin', async () => {
      callCount.n++;
    });
    pluginManager.registerBeforeFileSaveHook('test-plugin', async () => {
      callCount.n++;
    });

    const tempFile = await addTempFile();
    const saved = await fileManager.saveFile(
      tempFile.id,
      1,
      FileSaveType.EMOJI
    );
    tempFilesToCleanup.push(path.join(PUBLIC_PATH, saved.name));

    expect(callCount.n).toBe(2);
  });

  test('first hook rejection stops subsequent hooks from running', async () => {
    let secondHookCalled = false;

    pluginManager.registerBeforeFileSaveHook('plugin-one', async () => {
      throw new Error('first hook rejects');
    });
    pluginManager.registerBeforeFileSaveHook('plugin-two', async () => {
      secondHookCalled = true;
    });

    const tempFile = await addTempFile();

    await expect(
      fileManager.saveFile(tempFile.id, 1, FileSaveType.MESSAGE)
    ).rejects.toThrow('first hook rejects');

    expect(secondHookCalled).toBe(false);

    await fileManager.removeTemporaryFile(tempFile.id);
  });

  test('tempFile passed to hook is frozen (cannot be mutated directly)', async () => {
    let wasFrozen = false;

    pluginManager.registerBeforeFileSaveHook('test-plugin', async (payload) => {
      wasFrozen = Object.isFrozen(payload.tempFile);
    });

    const tempFile = await addTempFile();
    const saved = await fileManager.saveFile(
      tempFile.id,
      1,
      FileSaveType.BANNER
    );
    tempFilesToCleanup.push(path.join(PUBLIC_PATH, saved.name));

    expect(wasFrozen).toBe(true);
  });

  test('hooks are cleared when clearBeforeFileSaveHooks is called', async () => {
    let hookCalled = false;

    pluginManager.registerBeforeFileSaveHook('test-plugin', async () => {
      hookCalled = true;
    });

    pluginManager.clearBeforeFileSaveHooks();

    const tempFile = await addTempFile();
    const saved = await fileManager.saveFile(
      tempFile.id,
      1,
      FileSaveType.MESSAGE
    );
    tempFilesToCleanup.push(path.join(PUBLIC_PATH, saved.name));

    expect(hookCalled).toBe(false);
  });

  test('hook receives correct FileSaveType for each caller', async () => {
    const capturedTypes: FileSaveType[] = [];

    pluginManager.registerBeforeFileSaveHook(
      'test-plugin',
      async ({ type }) => {
        capturedTypes.push(type);
      }
    );

    const types = [
      FileSaveType.MESSAGE,
      FileSaveType.AVATAR,
      FileSaveType.BANNER,
      FileSaveType.EMOJI,
      FileSaveType.SERVER_LOGO
    ];

    for (const type of types) {
      const tempFile = await addTempFile();
      const saved = await fileManager.saveFile(tempFile.id, 1, type);
      tempFilesToCleanup.push(path.join(PUBLIC_PATH, saved.name));
    }

    expect(capturedTypes).toEqual(types);
  });
});
