import type { TFile } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { db } from '..';
import { logger } from '../../logger';
import { files, messageFiles } from '../schema';
import { fileManager } from '../../utils/file-manager';

const removeFile = async (fileId: number): Promise<TFile | undefined> => {
  await db.delete(messageFiles).where(eq(messageFiles.fileId, fileId));

  const removedFile = await db
    .delete(files)
    .where(eq(files.id, fileId))
    .returning()
    .get();

  if (removedFile) {
    try {
      fileManager.deleteFile(removedFile.uuid);
    } catch (error) {
      logger.error('Error deleting file from disk:', error);
    }
  }

  return removedFile;
};

export { removeFile };
