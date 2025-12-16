import { asc, sum } from 'drizzle-orm';
import { db } from '../..';
import { getSettings } from '../../queriesv2/server';
import { files } from '../../schema';

const getExceedingOldFiles = async (newFileSize: number) => {
  const { storageUploadMaxFileSize } = await getSettings();

  if (newFileSize > storageUploadMaxFileSize) {
    throw new Error('File size exceeds total server storage quota');
  }

  const currentUsage = await db
    .select({
      totalSize: sum(files.size)
    })
    .from(files)
    .get();

  const currentTotalSize = Number(currentUsage?.totalSize ?? 0);
  const wouldExceedBy =
    currentTotalSize + newFileSize - storageUploadMaxFileSize;

  if (wouldExceedBy <= 0) {
    return [];
  }

  const oldFiles = await db
    .select({
      id: files.id,
      name: files.name,
      size: files.size,
      userId: files.userId,
      createdAt: files.createdAt
    })
    .from(files)
    .orderBy(asc(files.createdAt))
    .all();

  const filesToDelete = [];
  let freedSpace = 0;

  for (const file of oldFiles) {
    filesToDelete.push(file);
    freedSpace += file.size;

    if (freedSpace >= wouldExceedBy) {
      break;
    }
  }

  return filesToDelete;
};

export { getExceedingOldFiles };
