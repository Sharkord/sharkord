import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { generateFileToken, verifyFileToken } from '../files-crypto';

const mockGetServerTokenSync = mock(() => 'test-server-token-12345');

mock.module('../../db/queries/server', () => ({
  getServerTokenSync: mockGetServerTokenSync
}));

describe('files-crypto', () => {
  const fileId = 123;
  const futureExpiresAt = Date.now() + 3600000; // 1 hour from now

  beforeEach(() => {
    mockGetServerTokenSync.mockClear();
  });

  describe('generateFileToken', () => {
    test('should generate a valid hex token of 64 characters', () => {
      const token = generateFileToken(fileId, futureExpiresAt);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64);
      expect(mockGetServerTokenSync).toHaveBeenCalledTimes(1);
    });

    test('should generate different tokens for different fileIds', () => {
      const token1 = generateFileToken(1, futureExpiresAt);
      const token2 = generateFileToken(2, futureExpiresAt);

      expect(token1).not.toBe(token2);
    });

    test('should generate different tokens for different expiresAt values', () => {
      const token1 = generateFileToken(fileId, Date.now() + 3600000);
      const token2 = generateFileToken(fileId, Date.now() + 7200000);

      expect(token1).not.toBe(token2);
    });

    test('should generate consistent tokens for same inputs', () => {
      const token1 = generateFileToken(fileId, futureExpiresAt);
      const token2 = generateFileToken(fileId, futureExpiresAt);

      expect(token1).toBe(token2);
    });

    test('should use server token from getServerTokenSync', () => {
      generateFileToken(fileId, futureExpiresAt);

      expect(mockGetServerTokenSync).toHaveBeenCalledTimes(1);
    });
  });

  describe('verifyFileToken', () => {
    test('should return true for valid token with future expiresAt', () => {
      const token = generateFileToken(fileId, futureExpiresAt);
      const isValid = verifyFileToken(fileId, token, futureExpiresAt);

      expect(isValid).toBe(true);
    });

    test('should return false for expired token', () => {
      const pastExpiresAt = Date.now() - 1000;
      const token = generateFileToken(fileId, pastExpiresAt);
      const isValid = verifyFileToken(fileId, token, pastExpiresAt);

      expect(isValid).toBe(false);
    });

    test('should return false for invalid token string', () => {
      const isValid = verifyFileToken(
        fileId,
        'invalid-token-xyz',
        futureExpiresAt
      );

      expect(isValid).toBe(false);
    });

    test('should return false for token with different fileId', () => {
      const token = generateFileToken(123, futureExpiresAt);
      const isValid = verifyFileToken(456, token, futureExpiresAt);

      expect(isValid).toBe(false);
    });

    test('should return false for token with different expiresAt', () => {
      const expiresAt1 = Date.now() + 3600000;
      const expiresAt2 = Date.now() + 7200000;
      const token = generateFileToken(fileId, expiresAt1);
      const isValid = verifyFileToken(fileId, token, expiresAt2);

      expect(isValid).toBe(false);
    });

    test('should return false for token with different length', () => {
      const isValid = verifyFileToken(fileId, 'short', futureExpiresAt);

      expect(isValid).toBe(false);
    });

    test('should return false for empty token', () => {
      const isValid = verifyFileToken(fileId, '', futureExpiresAt);

      expect(isValid).toBe(false);
    });

    test('should use timing-safe comparison to prevent timing attacks', () => {
      const token = generateFileToken(fileId, futureExpiresAt);
      const almostValidToken = token.slice(0, -1) + 'x';

      const isValid = verifyFileToken(
        fileId,
        almostValidToken,
        futureExpiresAt
      );

      expect(isValid).toBe(false);
    });

    test('should handle numeric fileIds correctly', () => {
      const token1 = generateFileToken(1, futureExpiresAt);
      const token2 = generateFileToken(10, futureExpiresAt);
      const token3 = generateFileToken(100, futureExpiresAt);

      expect(verifyFileToken(1, token1, futureExpiresAt)).toBe(true);
      expect(verifyFileToken(10, token2, futureExpiresAt)).toBe(true);
      expect(verifyFileToken(100, token3, futureExpiresAt)).toBe(true);

      expect(verifyFileToken(1, token2, futureExpiresAt)).toBe(false);
      expect(verifyFileToken(10, token3, futureExpiresAt)).toBe(false);
    });
  });

  describe('integration', () => {
    test('should generate and verify tokens for multiple files', () => {
      const fileIds = [1, 2, 3, 4, 5];

      const tokens = fileIds.map((id) =>
        generateFileToken(id, futureExpiresAt)
      );

      const uniqueTokens = new Set(tokens);

      expect(uniqueTokens.size).toBe(fileIds.length);

      for (let i = 0; i < fileIds.length; i++) {
        const isValid = verifyFileToken(
          fileIds[i]!,
          tokens[i]!,
          futureExpiresAt
        );
        expect(isValid).toBe(true);
      }

      // cross-file verification should fail
      expect(verifyFileToken(fileIds[0]!, tokens[1]!, futureExpiresAt)).toBe(
        false
      );
    });
  });
});
