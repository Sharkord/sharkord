import {
  FILE_TOKEN_REFRESH_GRACE_MS,
  FILE_TOKEN_REFRESH_MAX_FILES,
  type TFileAccessToken
} from '@sharkord/shared';
import { z } from 'zod';
import { getSettings } from '../../db/queries/server';
import {
  generateFileToken,
  verifyFileSignature
} from '../../helpers/files-crypto';
import { protectedProcedure } from '../../utils/trpc';

// a valid signature proves the caller was already handed this file, so no access check is needed
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
  .mutation(async ({ input }): Promise<TFileAccessToken[]> => {
    const { storageSignedUrlsEnabled, storageSignedUrlsTtlSeconds } =
      await getSettings();

    if (!storageSignedUrlsEnabled) return [];

    const now = Date.now();
    const expiresAt = now + storageSignedUrlsTtlSeconds * 1000;

    return input.files
      .filter(
        (file) =>
          file.expiresAt > now - FILE_TOKEN_REFRESH_GRACE_MS &&
          verifyFileSignature(file.id, file.token, file.expiresAt)
      )
      .map(({ id }) => ({
        id,
        token: generateFileToken(id, expiresAt),
        expiresAt
      }));
  });

export { refreshTokensRoute };
