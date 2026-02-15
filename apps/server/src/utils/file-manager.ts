import {
  StorageOverflowAction,
  type TFile,
  type TTempFile
} from '@sharkord/shared';
import { randomUUIDv7 } from 'bun';
import { createHash } from 'crypto';
import { eq } from 'drizzle-orm';
import fs from 'fs/promises';
import { createWriteStream } from 'fs'
import path from 'path';
import { db } from '../db';
import { removeFile } from '../db/mutations/files';
import { getExceedingOldFiles, getUsedFileQuota } from '../db/queries/files';
import { getSettings } from '../db/queries/server';
import { getStorageUsageByUserId } from '../db/queries/users';
import { files } from '../db/schema';
import { PUBLIC_PATH, TMP_PATH, UPLOADS_PATH } from '../helpers/paths';

/**
 * Files workflow:
 * 1. User uploads file via HTTP -> stored as temporary file in UPLOADS_PATH
 * 2. addTemporaryFile is called to move file to a managed temporary location in TMP_PATH
 * 3. Temporary file is tracked and auto-deleted after TTL
 * 4. When user confirms/save, saveFile is called to move file to PUBLIC_PATH and create DB entry
 * 5. Storage limits are checked before finalizing save
 */

const TEMP_FILE_TTL = 1000 * 60 * 1; // 1 minute

const md5File = async (path: string): Promise<string> => {
  const file = await fs.readFile(path);
  const hash = createHash('md5');

  hash.update(file);

  return hash.digest('hex');
};

const moveFile = async (src: string, dest: string) => {
  try {
    await fs.rename(src, dest);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    if (err.code === 'EXDEV') {
      await fs.copyFile(src, dest);
      await fs.unlink(src);
    } else {
      throw err;
    }
  }
};

class TemporaryFileManager {
  private temporaryFiles: Map<string, TTempFile> = new Map();

  public getTemporaryFile = (id: string): TTempFile | undefined => {
    return this.temporaryFiles.get(id)
  };

  public temporaryFileExists = (id: string): boolean => {
    return this.temporaryFiles.has(id)
  };

  public initTemporaryFile = async ({
    originalName,
    size,
    userId
  }: {
    originalName: string;
    size: number;
    userId: number
  }): Promise<TTempFile> => {
    const fileId = randomUUIDv7();
    const ext = path.extname(originalName);
    const safeName = `${fileId}${ext}`;

    const uploadFilePath = path.join(UPLOADS_PATH, safeName);
    const tempFilePath = path.join(TMP_PATH, safeName);
    const publicFilePath = path.join(PUBLIC_PATH, safeName);

    const tempFile: TTempFile = {
      id: fileId,
      originalName,
      safeName,
      size,
      md5: undefined,
      uploadPath: uploadFilePath,
      tempPath: tempFilePath,
      publicPath: publicFilePath,
      extension: ext,
      userId,
      timeout: undefined,
      fileStream: createWriteStream(uploadFilePath) // TODO: on-the-fly compression, will make md5 meaningless though
    };

    return tempFile;
  };

  public finishTemporaryFile = async (
    tempFile: TTempFile
  ) => {
    tempFile.md5 = await md5File(tempFile.uploadPath);

    tempFile.timeout = setTimeout(() => {
      this.removeTemporaryFile(tempFile.id);
    }, TEMP_FILE_TTL);

    await moveFile(tempFile.uploadPath, tempFile.tempPath);

    this.temporaryFiles.set(tempFile.id, tempFile);

    return tempFile;
  };

  public removeTemporaryFile = async (
    id: string,
    skipDelete = false
  ): Promise<void> => {
    const tempFile = this.temporaryFiles.get(id);

    if (!tempFile) {
      throw new Error('Temporary file not found');
    }

    clearTimeout(tempFile.timeout);

    if (!skipDelete) {
      try {
        await fs.unlink(tempFile.tempPath);
      } catch {
        // ignore
      }
    }

    this.temporaryFiles.delete(id);
  };
}

class FileManager {
  private tempFileManager = new TemporaryFileManager();

  public initTemporaryFile = this.tempFileManager.initTemporaryFile;
  public finishTemporaryFile = this.tempFileManager.finishTemporaryFile;

  public removeTemporaryFile = this.tempFileManager.removeTemporaryFile;

  public getTemporaryFile = this.tempFileManager.getTemporaryFile;
  public temporaryFileExists = this.tempFileManager.temporaryFileExists;

  private handleStorageLimits = async (tempFile: TTempFile) => {
    const [settings, userStorage, serverStorage] = await Promise.all([
      getSettings(),
      getStorageUsageByUserId(tempFile.userId),
      getUsedFileQuota()
    ]);

    const newTotalStorage = userStorage.usedStorage + tempFile.size;

    if (
      settings.storageSpaceQuotaByUser > 0 &&
      newTotalStorage > settings.storageSpaceQuotaByUser
    ) {
      throw new Error('User storage limit exceeded');
    }

    const newServerStorage = serverStorage + tempFile.size;

    if (settings.storageQuota > 0 && newServerStorage > settings.storageQuota) {
      if (
        settings.storageOverflowAction === StorageOverflowAction.PREVENT_UPLOADS
      ) {
        throw new Error('Server storage limit exceeded.');
      }

      if (
        settings.storageOverflowAction ===
        StorageOverflowAction.DELETE_OLD_FILES
      ) {
        const filesToDelete = await getExceedingOldFiles(tempFile.size);

        const promises = filesToDelete.map(async (file) => {
          await removeFile(file.id);
        });

        await Promise.all(promises);
      }
    }
  };

  public async saveFile(tempFileId: string, userId: number): Promise<TFile> {
    const tempFile = this.getTemporaryFile(tempFileId);

    if (!tempFile) {
      throw new Error('File not found');
    }

    if (tempFile.userId !== userId) {
      throw new Error("You don't have permission to access this file");
    }

    await this.handleStorageLimits(tempFile);

    await moveFile(tempFile.tempPath, tempFile.publicPath);
    await this.removeTemporaryFile(tempFileId, true);

    const bunFile = Bun.file(tempFile.publicPath);

    return db
      .insert(files)
      .values({
        name: tempFile.safeName,
        extension: tempFile.extension,
        md5: tempFile.md5 || '', // md5 will always be defined by now, this stops the undefined typing error
        size: tempFile.size,
        originalName: tempFile.originalName,
        userId,
        mimeType: bunFile?.type || 'application/octet-stream',
        createdAt: Date.now()
      })
      .returning()
      .get();
  }
}

const fileManager = new FileManager();

export { fileManager };
