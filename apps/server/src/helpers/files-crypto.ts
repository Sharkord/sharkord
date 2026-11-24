import type { TFile, TSettings } from '@sharkord/shared';
import crypto from 'crypto';
import { getServerTokenSync } from '../db/queries/server';

const generateFileToken = (fileId: number, expiresAt: number): string => {
  const hmac = crypto.createHmac('sha256', getServerTokenSync());

  hmac.update(`${fileId}:${expiresAt}`);

  return hmac.digest('hex');
};

const verifyFileSignature = (
  fileId: number,
  providedToken: string,
  expiresAt: number
): boolean => {
  const expectedToken = generateFileToken(fileId, expiresAt);

  if (expectedToken.length !== providedToken.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(expectedToken),
    Buffer.from(providedToken)
  );
};

const verifyFileToken = (
  fileId: number,
  providedToken: string,
  expiresAt: number
): boolean => {
  if (Date.now() > expiresAt) {
    return false;
  }

  return verifyFileSignature(fileId, providedToken, expiresAt);
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

type TAssetSigningSettings = Pick<
  TSettings,
  | 'storageSignedUrlsEnabled'
  | 'storageSignedUrlsIncludeAssets'
  | 'storageSignedUrlsTtlSeconds'
>;

const signAsset = <TAsset extends TFile | null>(
  file: TAsset,
  {
    storageSignedUrlsEnabled,
    storageSignedUrlsIncludeAssets,
    storageSignedUrlsTtlSeconds
  }: TAssetSigningSettings
): TAsset => {
  if (!file) return file;

  return attachFileToken(
    file,
    storageSignedUrlsEnabled && storageSignedUrlsIncludeAssets,
    storageSignedUrlsTtlSeconds
  ) as TAsset;
};

export {
  attachFileToken,
  generateFileToken,
  signAsset,
  verifyFileSignature,
  verifyFileToken
};
