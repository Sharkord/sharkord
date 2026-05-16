import {
  FileSaveType,
  getErrorMessage,
  STORAGE_MAX_IMAGE_OPTIMIZATION_QUALITY,
  STORAGE_MIN_IMAGE_OPTIMIZATION_QUALITY,
  StorageOverflowAction,
  type TBeforeFileSaveResult,
  type TFile,
  type TJoinedSettings,
  type TTempFile
} from '@sharkord/shared';
import { randomUUIDv7 } from 'bun';
import { createHash } from 'crypto';
import { eq } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';
import { db } from '../db';
import { removeFile } from '../db/mutations/files';
import { getExceedingOldFiles, getUsedFileQuota } from '../db/queries/files';
import { getEffectiveStorageSpaceQuotaByUserId } from '../db/queries/roles';
import { getSettings } from '../db/queries/server';
import { getStorageUsageByUserId } from '../db/queries/users';
import { files } from '../db/schema';
import { PUBLIC_PATH, TMP_PATH, UPLOADS_PATH } from '../helpers/paths';
import { logger } from '../logger';
import { pluginManager } from '../plugins';

/**
 * Files workflow:
 * 1. User uploads file via HTTP -> stored as temporary file in UPLOADS_PATH
 * 2. addTemporaryFile is called to move file to a managed temporary location in TMP_PATH
 * 3. Temporary file is tracked and auto-deleted after TTL
 * 4. When user confirms/save, saveFile is called to move file to PUBLIC_PATH and create DB entry
 * 5. Storage limits are checked before finalizing save
 */

const TEMP_FILE_TTL = 1000 * 60 * 1; // 1 minute
const OPTIMIZABLE_IMAGE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.heic',
  '.heif',
  '.avif'
]);

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

const getNormalizedExtension = (name: string): string => {
  return path.extname(name).toLowerCase();
};

class TemporaryFileManager {
  private temporaryFiles: TTempFile[] = [];
  private timeouts: {
    [id: string]: NodeJS.Timeout;
  } = {};

  public getTemporaryFile = (id: string): TTempFile | undefined => {
    return this.temporaryFiles.find((file) => file.id === id);
  };

  public temporaryFileExists = (id: string): boolean => {
    return !!this.temporaryFiles.find((file) => file.id === id);
  };

  public temporaryFileHasMimeType = (
    id: string,
    mimeTypePrefix: string
  ): boolean => {
    const temporaryFile = this.getTemporaryFile(id);

    if (!temporaryFile) {
      return false;
    }

    const bunFile = Bun.file(temporaryFile.path);

    return bunFile.type.startsWith(mimeTypePrefix);
  };

  public addTemporaryFile = async ({
    filePath,
    size,
    originalName,
    userId
  }: {
    filePath: string;
    size: number;
    originalName: string;
    userId: number;
  }): Promise<TTempFile> => {
    const md5 = await md5File(filePath);
    const fileId = randomUUIDv7();
    const ext = getNormalizedExtension(originalName);

    const tempFilePath = path.join(TMP_PATH, `${fileId}${ext}`);

    const tempFile: TTempFile = {
      id: fileId,
      originalName,
      size,
      md5,
      path: tempFilePath,
      extension: ext,
      userId
    };

    await moveFile(filePath, tempFile.path);

    this.temporaryFiles.push(tempFile);

    this.timeouts[tempFile.id] = setTimeout(() => {
      this.removeTemporaryFile(tempFile.id);
    }, TEMP_FILE_TTL);

    return tempFile;
  };

  public removeTemporaryFile = async (
    id: string,
    skipDelete = false
  ): Promise<void> => {
    const tempFile = this.temporaryFiles.find((file) => file.id === id);

    if (!tempFile) {
      throw new Error('Temporary file not found');
    }

    clearTimeout(this.timeouts[id]);

    if (!skipDelete) {
      try {
        await fs.unlink(tempFile.path);
      } catch {
        // ignore
      }
    }

    this.temporaryFiles = this.temporaryFiles.filter((file) => file.id !== id);
  };

  public getSafeUploadPath = async (name: string): Promise<string> => {
    const ext = getNormalizedExtension(name);
    const safePath = path.join(UPLOADS_PATH, `${randomUUIDv7()}${ext}`);

    return safePath;
  };
}

class FileManager {
  private tempFileManager = new TemporaryFileManager();

  public getSafeUploadPath = this.tempFileManager.getSafeUploadPath;

  public addTemporaryFile = this.tempFileManager.addTemporaryFile;

  public removeTemporaryFile = this.tempFileManager.removeTemporaryFile;

  public getTemporaryFile = this.tempFileManager.getTemporaryFile;
  public temporaryFileExists = this.tempFileManager.temporaryFileExists;

  public temporaryFileHasMimeType =
    this.tempFileManager.temporaryFileHasMimeType;

  private handleStorageLimits = async (
    tempFile: TTempFile,
    settings: TJoinedSettings
  ) => {
    const [userStorage, serverStorage, userStorageQuota] = await Promise.all([
      getStorageUsageByUserId(tempFile.userId),
      getUsedFileQuota(),
      getEffectiveStorageSpaceQuotaByUserId(
        tempFile.userId,
        settings.storageSpaceQuotaByUser
      )
    ]);

    const newTotalStorage = userStorage.usedStorage + tempFile.size;

    if (userStorageQuota > 0 && newTotalStorage > userStorageQuota) {
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

  private optimizeImageIfEnabled = async (
    tempFile: TTempFile,
    settings: TJoinedSettings
  ) => {
    if (
      !settings.storageImageOptimizationEnabled ||
      !OPTIMIZABLE_IMAGE_EXTENSIONS.has(tempFile.extension)
    ) {
      return;
    }

    const quality = Math.max(
      STORAGE_MIN_IMAGE_OPTIMIZATION_QUALITY,
      Math.min(
        settings.storageImageOptimizationQuality,
        STORAGE_MAX_IMAGE_OPTIMIZATION_QUALITY
      )
    );

    const optimizedPath = path.join(TMP_PATH, `${tempFile.id}-optimized.webp`);

    try {
      await Bun.file(tempFile.path)
        .image()
        .webp({ quality })
        .write(optimizedPath);

      const [currentStats, optimizedStats] = await Promise.all([
        fs.stat(tempFile.path),
        fs.stat(optimizedPath)
      ]);

      if (optimizedStats.size >= currentStats.size) {
        // this will probably never happen with quality settings below 100, but just in case - don't replace original if optimization doesn't reduce file size
        await fs.unlink(optimizedPath);

        return;
      }

      const previousPath = tempFile.path;
      const originalBaseName = path.basename(
        tempFile.originalName,
        path.extname(tempFile.originalName)
      );

      tempFile.path = optimizedPath;
      tempFile.size = optimizedStats.size;
      tempFile.md5 = await md5File(optimizedPath);
      tempFile.extension = '.webp';
      tempFile.originalName = `${originalBaseName}.webp`;

      await fs.unlink(previousPath);
    } catch (error) {
      logger.error(
        `Image optimization failed for ${tempFile.originalName}: ${getErrorMessage(error)}`
      );

      try {
        await fs.unlink(optimizedPath);
      } catch {
        // ignore
      }
    }
  };

  private validateFinalFileSize = (
    tempFile: TTempFile,
    type: FileSaveType | undefined,
    settings: TJoinedSettings
  ) => {
    if (
      type === FileSaveType.AVATAR &&
      tempFile.size > settings.storageMaxAvatarSize
    ) {
      throw new Error(
        `Avatar file exceeds the configured maximum size of ${settings.storageMaxAvatarSize / (1024 * 1024)} MB`
      );
    }

    if (
      type === FileSaveType.BANNER &&
      tempFile.size > settings.storageMaxBannerSize
    ) {
      throw new Error(
        `Banner file exceeds the configured maximum size of ${settings.storageMaxBannerSize / (1024 * 1024)} MB`
      );
    }
  };

  private applyBeforeFileSaveResult = async (
    tempFile: TTempFile,
    newFilePath: TBeforeFileSaveResult
  ) => {
    try {
      if (!newFilePath) return;

      await fs.stat(newFilePath);

      const previousPath = tempFile.path;

      tempFile.path = newFilePath;
      tempFile.size = (await fs.stat(newFilePath)).size;
      tempFile.md5 = await md5File(newFilePath);

      if (previousPath !== newFilePath) {
        try {
          await fs.unlink(previousPath);
        } catch {
          // ignore
        }
      }
    } catch (error) {
      throw new Error(
        `Failed to apply file changes from beforeFileSave hook: ${getErrorMessage(error)}`
      );
    }
  };

  private getUniqueName = async (originalName: string): Promise<string> => {
    const baseName = path.basename(originalName, path.extname(originalName));
    const extension = getNormalizedExtension(originalName);

    let fileName = `${baseName}${extension}`;
    let counter = 2;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const existingFile = await db
        .select()
        .from(files)
        .where(eq(files.name, fileName))
        .get();

      if (!existingFile) {
        break;
      }

      fileName = `${baseName}-${counter}${extension}`;
      counter++;
    }

    return fileName;
  };

  public async saveFile(
    tempFileId: string,
    userId: number,
    type?: FileSaveType
  ): Promise<TFile> {
    const tempFile = this.getTemporaryFile(tempFileId);

    if (!tempFile) {
      throw new Error('File not found');
    }

    if (tempFile.userId !== userId) {
      throw new Error("You don't have permission to access this file");
    }

    if (type) {
      const hooks = pluginManager.getBeforeFileSaveHooks();

      for (const { handlers } of hooks) {
        for (const handler of handlers) {
          // freeze file to prevent plugins from modifying it directly - they must return a new path if they want to change the file
          const frozenFile = Object.freeze({ ...tempFile });

          const result = await handler({
            tempFile: frozenFile,
            userId,
            type
          });

          await this.applyBeforeFileSaveResult(tempFile, result);
        }
      }
    }

    const settings = await getSettings();

    await this.optimizeImageIfEnabled(tempFile, settings);

    // check for file size after optimization but before moving to final destination to prevent hitting storage limits with optimized files
    this.validateFinalFileSize(tempFile, type, settings);

    await this.handleStorageLimits(tempFile, settings);

    const fileName = await this.getUniqueName(tempFile.originalName);
    const destinationPath = path.join(PUBLIC_PATH, fileName);

    await moveFile(tempFile.path, destinationPath);
    await this.removeTemporaryFile(tempFileId, true);

    const bunFile = Bun.file(destinationPath);

    return db
      .insert(files)
      .values({
        name: fileName,
        extension: tempFile.extension,
        md5: tempFile.md5,
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
