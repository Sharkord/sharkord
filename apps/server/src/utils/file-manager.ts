import {
  FileStatus,
  StorageOverflowAction,
  type TFile,
  type TTempFile
} from '@sharkord/shared';
import { randomUUIDv7 } from 'bun';
import { createHash } from 'crypto';
import { eq, and } from 'drizzle-orm';
import fs from 'fs/promises';
import zlib from 'zlib';
import { createReadStream, createWriteStream, ReadStream } from 'fs'
import { pipeline } from 'stream/promises';
import path from 'path';
import { db } from '../db';
import { getMessageByFileId } from '../db/queries/messages';
import { verifyFileToken } from '../helpers/files-crypto';
import { removeFile } from '../db/mutations/files';
import { getExceedingOldFiles, getUsedFileQuota, isFileOrphaned } from '../db/queries/files';
import { getSettings } from '../db/queries/server';
import { getStorageUsageByUserId } from '../db/queries/users';
import { channels, files } from '../db/schema';
import { PUBLIC_PATH, TMP_PATH, UPLOADS_PATH } from '../helpers/paths';
import { config } from '../config';

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

    const uploadFilePath = path.join(UPLOADS_PATH, fileId);
    const tempFilePath = path.join(TMP_PATH, fileId);
    const publicFilePath = path.join(
      PUBLIC_PATH,
      this.fileUUIDToPath(fileId)
    )

    const tempFile: TTempFile = {
      id: fileId,
      originalName,
      size,
      md5: undefined,
      uploadPath: uploadFilePath,
      tempPath: tempFilePath,
      publicPath: publicFilePath,
      extension: ext,
      originalSize: size,
      compressed: false,
      userId,
      timeout: undefined,
      fileStream: createWriteStream(uploadFilePath)
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

  public fileUUIDToPath = (fileUUID: string): string => {
    return path.join(
      fileUUID.slice(24,26), // UUIDv7 starts with a timestamp, using this to group into random folders
      fileUUID.slice(26,28),
      fileUUID
    );
  }
}

class FileManager {
  private tempFileManager = new TemporaryFileManager();

  public initTemporaryFile = this.tempFileManager.initTemporaryFile;
  public finishTemporaryFile = this.tempFileManager.finishTemporaryFile;

  public removeTemporaryFile = this.tempFileManager.removeTemporaryFile;

  public getTemporaryFile = this.tempFileManager.getTemporaryFile;
  public temporaryFileExists = this.tempFileManager.temporaryFileExists;

  private fileUUIDToPath = this.tempFileManager.fileUUIDToPath;

  private attemptCompression = async (tempFile: TTempFile): Promise<TTempFile> => {
    if (!config.storage.gzipCompression) return tempFile;
    const compressedPath = `${tempFile.tempPath}.gz`;
    const gzip = zlib.createGzip();
    const readStream = createReadStream(tempFile.tempPath);
    const writeStream = createWriteStream(compressedPath);

    await pipeline(readStream, gzip, writeStream)

    const compressedStats = await fs.stat(compressedPath);
    if (compressedStats.size < tempFile.size) {
      await fs.unlink(tempFile.tempPath)
      tempFile.size = compressedStats.size;
      tempFile.tempPath = compressedPath;
      tempFile.compressed = true;
    } else {
      await fs.unlink(compressedPath);
    }
    return tempFile;
  }

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

  public saveFile(tempFileId: string, userId: number): [TFile, Promise<void>] {
    const tempFile = this.getTemporaryFile(tempFileId);

    if (!tempFile) {
      throw new Error('File not found');
    }

    if (tempFile.userId !== userId) {
      throw new Error("You don't have permission to access this file");
    }

    clearTimeout(tempFile.timeout);

    const bunFile = Bun.file(`${tempFile.publicPath}${tempFile.extension}`); // TODO: replace with actual bytes check

    const fileRecord = db.insert(files)
      .values({
        uuid: tempFile.id,
        originalName: tempFile.originalName,
        md5: null,
        userId,
        size: null,
        mimeType: bunFile?.type || 'application/octet-stream',
        extension: tempFile.extension,
        originalSize: tempFile.originalSize,
        compressed: null,
        status: FileStatus.Processing,
        createdAt: Date.now()
      }).returning()
      .get();

    const encodeProcess = this.attemptCompression(tempFile).then(() => 
      this.handleStorageLimits(tempFile)
    ).then(() => 
      fs.mkdir(path.dirname(tempFile.publicPath), { recursive: true })
    ).then(() => 
      moveFile(tempFile.tempPath, tempFile.publicPath)
    ).then(() => 
      this.removeTemporaryFile(tempFileId, true)
    ).then(() => 
      db.update(files).set({
        md5: tempFile.md5,
        size: tempFile.size,
        compressed: tempFile.compressed,
        status: FileStatus.Complete,
        updatedAt: Date.now()
      })
      .where(eq(files.id, fileRecord.id))
    );

    return [fileRecord, encodeProcess];
  }

  public async getFile(fileUUID: string, fileName: string, fileAccessToken: string | null): Promise<[TFile, ReadStream]> {
    const dbFile = await db
      .select()
      .from(files)
      .where(
        and(
          eq(files.uuid, fileUUID),
          eq(files.originalName, fileName)
        )
      )
      .get();
    
    if (!dbFile) {
      throw new Error('notFound');
    }

    const isOrphaned = await isFileOrphaned(dbFile.id);

    if (isOrphaned) {
      throw new Error('notFound');
    }

    // it's gonna be defined if it's a message file
    // otherwise is something like an avatar or banner or something else
    // we can assume this because of the orphaned check above
    const associatedMessage = await getMessageByFileId(dbFile.id);

    if (associatedMessage) {
      const channel = await db
        .select()
        .from(channels)
        .where(eq(channels.id, associatedMessage.channelId))
        .get();

      if (channel && channel.private) {
        const isValidToken = verifyFileToken(
          dbFile.id,
          channel.fileAccessToken,
          fileAccessToken || ''
        );

        if (!isValidToken) {
          throw new Error('Forbidden');
        }
      }
    }
    
    if (dbFile.status !== FileStatus.Complete) {
      throw new Error('processing');
    }

    const filePath: string = path.join(
      PUBLIC_PATH,
      this.fileUUIDToPath(fileUUID)
    )
    
    if (!await fs.exists(filePath)) {
      throw new Error('notFound');
    }

    return [
      dbFile,
      createReadStream(filePath)
    ]
  }

  public async deleteFile(uuid: string) {
    return fs.unlink(path.join(PUBLIC_PATH, this.fileUUIDToPath(uuid)));
  }
}

const fileManager = new FileManager();

export { fileManager };
