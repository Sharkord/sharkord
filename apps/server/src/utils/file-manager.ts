import {
  StorageOverflowAction,
  type TFile,
  type TTempFile
} from '@sharkord/shared';
import { randomUUIDv7 } from 'bun';
import { createHash } from 'crypto';
import { eq, and } from 'drizzle-orm';
import fs from 'fs/promises';
import zlib from 'zlib';
import { createReadStream, createWriteStream } from 'fs'
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
import { fileTypeFromFile } from 'file-type';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg'
import util from 'node:util';
const ffprobe = util.promisify(ffmpeg.ffprobe);
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

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

function processVideo(inputPath: string, outputPath: string) {
  return new Promise(async (resolve, reject) => {
    // Read metadata to determine if scaling is necessary, and scale it to a max width/height of 720p (TODO: allow configuration)
    const [maxWidth, maxHeight] = [720, 1280];
    const metaData: ffmpeg.FfprobeData = await ffprobe(inputPath);
    const videoMetaData: ffmpeg.FfprobeStream = metaData.streams.find((streamMetaData) => streamMetaData.codec_type === 'video')
    const [inputWidth, inputHeight] = [videoMetaData?.width || maxWidth, videoMetaData?.height || maxHeight]
    const [scaleWidthFactor, scaleHeightFactor] = [inputWidth / maxWidth, inputHeight / maxHeight]
    let scaleFilter = 'scale=iw:ih';
    if (scaleWidthFactor > scaleHeightFactor && scaleWidthFactor > 1) { // Width is biggest deviator from max, and is bigger than maxWidth
      scaleFilter = `scale=${maxWidth}:-2`;
    } else if (scaleHeightFactor > scaleWidthFactor && scaleHeightFactor > 1) { // Height is biggest deviator from max, and is bigger than maxHeight
      scaleFilter = `scale=-2:${maxHeight}`;
    }
    ffmpeg(inputPath)
      .videoCodec('libx265') // TODO: give option for selecting hwencode
      .videoFilters(scaleFilter)
      .output(outputPath)
      .on('end', resolve)
      .on('error', reject)
      .run()
  })
}

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

  private reEncodeMedia = async (tempFile:TTempFile): Promise<TTempFile> => {
    const fileType = await fileTypeFromFile(tempFile.tempPath);
    if (!fileType) return tempFile;
    const mimeGroup = fileType.mime.split('/')[0];

    try {
      if (mimeGroup === 'image') {
        const sourceImage = sharp(tempFile.tempPath, { animated: true });
        const metaData = await sourceImage.metadata();
        const newTempFile = `${tempFile.tempPath}.webp`;
        await sourceImage
          .webp( {quality: 80} )
          .resize(Math.min(metaData.width, 1000), Math.min(metaData.height, 1000), {fit: 'inside'})
          .toFile(newTempFile);
        await fs.unlink(tempFile.tempPath);
        tempFile.originalName = path.basename(tempFile.originalName, tempFile.extension) + '.webp';
        tempFile.extension = '.webp';
        tempFile.tempPath = newTempFile;
        tempFile.md5 = await md5File(tempFile.tempPath);
      } else if (mimeGroup === 'video') {
        const newTempFile = `${tempFile.tempPath}.mp4`;
        await processVideo(tempFile.tempPath, newTempFile).catch((err) => console.error(err));
        await fs.unlink(tempFile.tempPath)
        tempFile.originalName = path.basename(tempFile.originalName, tempFile.extension) + '.mp4';
        tempFile.extension = '.mp4'
        tempFile.tempPath = newTempFile;
        tempFile.md5 = await md5File(tempFile.tempPath)
      }
    } catch (err) {
      // log error?
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

  public async saveFile(tempFileId: string, userId: number): Promise<TFile> {
    const tempFile = this.getTemporaryFile(tempFileId);

    if (!tempFile) {
      throw new Error('File not found');
    }

    if (tempFile.userId !== userId) {
      throw new Error("You don't have permission to access this file");
    }

    await this.reEncodeMedia(tempFile);

    await this.attemptCompression(tempFile);

    await this.handleStorageLimits(tempFile);

    await moveFile(tempFile.tempPath, tempFile.publicPath);
    await this.removeTemporaryFile(tempFileId, true);

    const bunFile = Bun.file(`${tempFile.publicPath}${tempFile.extension}`); // TODO: replace with actual bytes check

    return db
      .insert(files)
      .values({
        uuid: tempFile.id,
        originalName: tempFile.originalName,
        md5: tempFile.md5 || '', // md5 will always be defined by now, this stops the undefined typing error
        userId,
        size: tempFile.size,
        mimeType: bunFile?.type || 'application/octet-stream',
        extension: tempFile.extension,
        originalSize: tempFile.originalSize,
        compressed: tempFile.compressed,
        createdAt: Date.now()
      })
      .returning()
      .get();
  }

  public async getFile(fileUUID: string, fileName: string, fileAccessToken: string | null): Promise<any> {
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
    
    const filePath: string = path.join(
      PUBLIC_PATH,
      this.fileUUIDToPath(fileUUID)
    )
    
    if (!await fs.exists(filePath)) {
      throw new Error('notFound');
    }

    return {
      dbFile,
      fileStream: createReadStream(filePath)
    }
  }
}

const fileManager = new FileManager();

export { fileManager };
