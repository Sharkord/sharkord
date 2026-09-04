import {
  FileSaveType,
  getErrorMessage,
  STORAGE_MAX_IMAGE_OPTIMIZATION_QUALITY,
  STORAGE_MIN_IMAGE_OPTIMIZATION_QUALITY,
  StorageOverflowAction,
  type TBeforeFileSavePayload,
  type TBeforeFileSaveUpdate,
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
import { runHook } from '../plugins/run-hook';

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
    userId: number | null;
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
    const { userId } = tempFile;

    if (userId !== null && userId !== undefined) {
      const [userStorage, userStorageQuota] = await Promise.all([
        getStorageUsageByUserId(userId),
        getEffectiveStorageSpaceQuotaByUserId(
          userId,
          settings.storageSpaceQuotaByUser
        )
      ]);

      const newTotalStorage = userStorage.usedStorage + tempFile.size;

      if (userStorageQuota > 0 && newTotalStorage > userStorageQuota) {
        throw new Error('User storage limit exceeded');
      }
    }

    const serverStorage = await getUsedFileQuota();

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

  private runBeforeFileSaveHooks = async (
    tempFile: TTempFile,
    userId: number | null,
    type: FileSaveType
  ) => {
    const entries = pluginManager.getHooks('beforeFileSave');

    if (entries.length === 0) return;

    let bytes: Uint8Array | undefined;

    const result = await runHook<
      TBeforeFileSavePayload & TBeforeFileSaveUpdate,
      TBeforeFileSaveUpdate
    >({
      entries,
      payload: {
        readBytes: async () =>
          (bytes ??= await Bun.file(tempFile.path).bytes()),
        originalName: tempFile.originalName,
        extension: tempFile.extension,
        size: tempFile.size,
        userId: userId ?? undefined,
        type
      },
      normalize: (payload) => {
        if (!payload.bytes) return payload;

        bytes = payload.bytes;

        return { ...payload, size: payload.bytes.byteLength };
      }
    });

    if (result.originalName !== tempFile.originalName) {
      tempFile.originalName = result.originalName;
    }

    if (!result.bytes) return;

    await fs.writeFile(tempFile.path, result.bytes);

    tempFile.size = result.bytes.byteLength;
    tempFile.md5 = await md5File(tempFile.path);
  };

  private async persistTempFile(
    tempFile: TTempFile,
    owner: { userId: number | null; pluginId: string | null },
    type?: FileSaveType
  ): Promise<TFile> {
    if (type) {
      await this.runBeforeFileSaveHooks(tempFile, owner.userId, type);
    }

    const settings = await getSettings();

    await this.optimizeImageIfEnabled(tempFile, settings);

    // after optimization but before the move, so an optimized file cannot slip
    // past the storage limits
    this.validateFinalFileSize(tempFile, type, settings);

    await this.handleStorageLimits(tempFile, settings);

    const fileName = await this.getUniqueName(tempFile.originalName);
    const destinationPath = path.join(PUBLIC_PATH, fileName);

    await moveFile(tempFile.path, destinationPath);
    await this.removeTemporaryFile(tempFile.id, true);

    const bunFile = Bun.file(destinationPath);

    return db
      .insert(files)
      .values({
        name: fileName,
        extension: tempFile.extension,
        md5: tempFile.md5,
        size: tempFile.size,
        originalName: tempFile.originalName,
        userId: owner.userId,
        pluginId: owner.pluginId,
        mimeType: bunFile?.type || 'application/octet-stream',
        createdAt: Date.now()
      })
      .returning()
      .get();
  }

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

    return this.persistTempFile(tempFile, { userId, pluginId: null }, type);
  }

  public async savePluginFile(
    pluginId: string,
    originalName: string,
    data: Uint8Array
  ): Promise<TFile> {
    const stagingPath = path.join(
      TMP_PATH,
      `${randomUUIDv7()}${getNormalizedExtension(originalName)}`
    );

    await fs.writeFile(stagingPath, data);

    const tempFile = await this.addTemporaryFile({
      filePath: stagingPath,
      size: data.byteLength,
      originalName,
      userId: null
    });

    try {
      return await this.persistTempFile(
        tempFile,
        { userId: null, pluginId },
        FileSaveType.MESSAGE
      );
    } catch (error) {
      await this.removeTemporaryFile(tempFile.id);

      throw error;
    }
  }
}

const fileManager = new FileManager();

export { fileManager };
