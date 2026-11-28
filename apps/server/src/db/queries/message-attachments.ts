import type { TFile, TSettings } from '@sharkord/shared';
import { eq, inArray } from 'drizzle-orm';
import { db } from '..';
import { attachFileToken } from '../../helpers/files-crypto';
import { files, messageFiles } from '../schema';
import { getViewersByFileIds } from './files';

type TFileSigningSettings = Pick<
  TSettings,
  'storageSignedUrlsEnabled' | 'storageSignedUrlsTtlSeconds'
>;

const getMessageAttachments = async (
  messageIds: number[],
  {
    storageSignedUrlsEnabled,
    storageSignedUrlsTtlSeconds
  }: TFileSigningSettings
): Promise<Record<number, TFile[]>> => {
  if (messageIds.length === 0) return {};

  const attachments = await db
    .select({ messageId: messageFiles.messageId, file: files })
    .from(messageFiles)
    .innerJoin(files, eq(files.id, messageFiles.fileId))
    .where(inArray(messageFiles.messageId, messageIds));
  const viewOnceFileIds = attachments.flatMap(({ file }) =>
    file.viewOnce ? [file.id] : []
  );

  const viewersByFileId = await getViewersByFileIds(viewOnceFileIds);

  const filesByMessage: Record<number, TFile[]> = {};

  for (const { messageId, file } of attachments) {
    const attachment = file.viewOnce
      ? {
          ...file,
          name: '',
          originalName: '',
          md5: '',
          _viewedBy: viewersByFileId.get(file.id) ?? []
        }
      : attachFileToken(
          file,
          storageSignedUrlsEnabled,
          storageSignedUrlsTtlSeconds
        );
    const list = (filesByMessage[messageId] ??= []);

    list.push(attachment);
  }

  return filesByMessage;
};

export { getMessageAttachments };
