import {
  FILE_TOKEN_REFRESH_GRACE_MS,
  FILE_TOKEN_REFRESH_MAX_FILES,
  type TFileAccessToken
} from '@sharkord/shared';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { getChannelsForUser } from '../../db/queries/channels';
import { getSettings } from '../../db/queries/server';
import { messageFiles, messages } from '../../db/schema';
import {
  generateFileToken,
  verifyFileSignature
} from '../../helpers/files-crypto';
import { protectedProcedure } from '../../utils/trpc';

// a valid signature only proves the caller was handed the file once. message attachments are
// the only files scoped to a channel, so they are checked against the channels the caller can
// see now, otherwise losing access to a channel would never stop its files from refreshing
const refreshTokensRoute = protectedProcedure
  .input(
    z.object({
      files: z
        .array(
          z.object({
            id: z.number().int().positive(),
            token: z.string().max(128),
            expiresAt: z.number().int()
          })
        )
        .max(FILE_TOKEN_REFRESH_MAX_FILES)
    })
  )
  .mutation(async ({ ctx, input }): Promise<TFileAccessToken[]> => {
    const { storageSignedUrlsEnabled, storageSignedUrlsTtlSeconds } =
      await getSettings();

    if (!storageSignedUrlsEnabled) return [];

    const now = Date.now();
    const expiresAt = now + storageSignedUrlsTtlSeconds * 1000;

    const signedFileIds = input.files
      .filter(
        (file) =>
          file.expiresAt > now - FILE_TOKEN_REFRESH_GRACE_MS &&
          verifyFileSignature(file.id, file.token, file.expiresAt)
      )
      .map(({ id }) => id);

    if (signedFileIds.length === 0) return [];

    const [attachments, visibleChannels] = await Promise.all([
      db
        .select({
          fileId: messageFiles.fileId,
          channelId: messages.channelId
        })
        .from(messageFiles)
        .innerJoin(messages, eq(messages.id, messageFiles.messageId))
        .where(inArray(messageFiles.fileId, signedFileIds)),
      getChannelsForUser(ctx.userId)
    ]);

    const visibleChannelIds = new Set(visibleChannels.map(({ id }) => id));
    const hiddenFileIds = new Set(
      attachments
        .filter(({ channelId }) => !visibleChannelIds.has(channelId))
        .map(({ fileId }) => fileId)
    );

    return signedFileIds
      .filter((id) => !hiddenFileIds.has(id))
      .map((id) => ({
        id,
        token: generateFileToken(id, expiresAt),
        expiresAt
      }));
  });

export { refreshTokensRoute };
