import { FileSaveType } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { removeFile } from '../db/mutations/files';
import { publishUser } from '../db/publishers';
import { getUserById } from '../db/queries/users';
import { users } from '../db/schema';
import { fileManager } from '../utils/file-manager';
import { invariant } from '../utils/invariant';

type TUserImageTarget = 'avatar' | 'banner';

const changeUserImage = async (
  userId: number,
  target: TUserImageTarget,
  fileId?: string
) => {
  const isAvatar = target === 'avatar';

  invariant(!fileId || fileManager.temporaryFileHasMimeType(fileId, 'image/'), {
    code: 'BAD_REQUEST',
    message: 'Invalid file type. Please try again.'
  });

  const user = await getUserById(userId);

  invariant(user, {
    code: 'NOT_FOUND',
    message: 'User not found'
  });

  const previousFileId = isAvatar ? user.avatarId : user.bannerId;
  let nextFileId: number | null = null;

  if (fileId) {
    const tempFile = await fileManager.getTemporaryFile(fileId);

    invariant(tempFile, {
      code: 'NOT_FOUND',
      message: 'Temporary file not found'
    });

    // saved before anything is destroyed: a rejected save (quota, size limit,
    // plugin hook) must not leave the user with no image at all
    const newFile = await fileManager.saveFile(
      fileId,
      userId,
      isAvatar ? FileSaveType.AVATAR : FileSaveType.BANNER
    );

    nextFileId = newFile.id;
  }

  await db
    .update(users)
    .set(isAvatar ? { avatarId: nextFileId } : { bannerId: nextFileId })
    .where(eq(users.id, userId))
    .run();

  if (previousFileId) {
    await removeFile(previousFileId);
  }

  publishUser(userId, 'update');
};

export { changeUserImage, type TUserImageTarget };
