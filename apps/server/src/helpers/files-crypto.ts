import type { TFile } from '@sharkord/shared';
import crypto from 'crypto';
import { getServerTokenSync } from '../db/queries/server';

const generateFileToken = (fileId: number, expiresAt: number): string => {
  const hmac = crypto.createHmac('sha256', getServerTokenSync());

  hmac.update(`${fileId}:${expiresAt}`);

  return hmac.digest('hex');
};

const verifyFileToken = (
  fileId: number,
  providedToken: string,
  expiresAt: number
): boolean => {
  if (Date.now() > expiresAt) {
    return false;
  }

  const expectedToken = generateFileToken(fileId, expiresAt);

  if (expectedToken.length !== providedToken.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(expectedToken),
    Buffer.from(providedToken)
  );
};

const attachFileToken = (
  file: TFile,
  signedUrlsEnabled: boolean,
  ttlSeconds: number
): TFile => {
  if (!signedUrlsEnabled) return file;

  const expiresAt = Date.now() + ttlSeconds * 1000;

  return {
    ...file,
    _accessToken: generateFileToken(file.id, expiresAt),
    _accessTokenExpiresAt: expiresAt
  };
};

// used to attach token to the file, but in cases where the file might not exist (eg: user logo, user might not have a logo set, so file can be null)
const signFile = (
  file: TFile | null,
  enabled: boolean,
  ttl: number
): TFile | null => {
  if (!file) return null;

  return attachFileToken(file, enabled, ttl);
};

export { attachFileToken, generateFileToken, signFile, verifyFileToken };
