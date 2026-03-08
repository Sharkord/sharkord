import { UploadHeaders, type TTempFile } from '@sharkord/shared';
import { afterAll, beforeEach, describe, expect, test } from 'bun:test';
import fs from 'fs/promises';
import path from 'path';
import { login, uploadFile } from '../../__tests__/helpers';
import { tdb, testsBaseUrl } from '../../__tests__/setup';
import { settings } from '../../db/schema';
import { TMP_PATH } from '../../helpers/paths';
import { sanitizeFileName } from '../helpers';

const getMockFile = (content: string): File => {
  const blob = new Blob([content], { type: 'text/plain' });

  return new File([blob], 'test-upload.txt', { type: 'text/plain' });
};

describe('/upload', () => {
  let token: string;

  beforeEach(async () => {
    if (token) return;

    const response = await login('testowner', 'password123');
    const data: any = await response.json();

    token = data.token;
  });

  afterAll(async () => {
    const files = await fs.readdir(TMP_PATH);

    for (const file of files) {
      await fs.unlink(path.join(TMP_PATH, file));
    }
  });

  test('should upload a file successfully', async () => {
    const file = getMockFile('Hello, this is a test file for upload.');
    const response = await uploadFile(file, token);

    expect(response.status).toBe(200);

    const data = (await response.json()) as TTempFile;

    const expectedPath = path.join(TMP_PATH, `${data.id}${data.extension}`);

    expect(data).toBeDefined();
    expect(data.id).toBeDefined();
    expect(data.originalName).toBe(file.name);
    expect(data.size).toBe(file.size);
    expect(data.md5).toBeDefined();
    expect(data.extension).toBe('.txt');
    expect(data.userId).toBe(1);
    expect(data.path).toBe(expectedPath);

    expect(await fs.exists(expectedPath)).toBe(true);
    expect(await fs.readFile(expectedPath, 'utf-8')).toBe(
      'Hello, this is a test file for upload.'
    );
    expect((await fs.stat(expectedPath)).size).toBe(file.size);
  });

  test('should throw when upload headers are missing', async () => {
    const file = getMockFile('This upload will fail due to missing headers.');
    const response = await fetch(`${testsBaseUrl}/upload`, {
      method: 'POST',
      body: file
    });

    expect(response.status).toBe(400);

    const data: any = await response.json();

    expect(data).toHaveProperty('errors');
    expect(data.errors[UploadHeaders.TOKEN]).toBeDefined();
    expect(data.errors[UploadHeaders.ORIGINAL_NAME]).toBeDefined();
  });

  test('should throw when upload token is invalid', async () => {
    const file = getMockFile('This upload will fail due to invalid token.');
    const response = await uploadFile(file, 'invalid-token');

    expect(response.status).toBe(401);

    const data: any = await response.json();

    expect(data).toHaveProperty('error', 'Unauthorized');
  });

  test('should throw when uploads are disabled', async () => {
    await tdb.update(settings).set({ storageUploadEnabled: false });

    const file = getMockFile('gonna fail');
    const response = await uploadFile(file, token);

    expect(response.status).toBe(403);

    const data: any = await response.json();

    expect(data).toHaveProperty(
      'error',
      'File uploads are disabled on this server'
    );
  });

  test('should throw when file exceeds max size', async () => {
    await tdb
      .update(settings)
      .set({ storageUploadMaxFileSize: 5 * 1024 * 1024 }); // 5 MB

    const largeContent = 'A'.repeat(5 * 1024 * 1024 + 1); // 5 MB + 1 byte
    const file = getMockFile(largeContent);
    const response = await uploadFile(file, token);

    expect(response.status).toBe(413);

    const data: any = await response.json();

    expect(data).toHaveProperty(
      'error',
      `File ${file.name} exceeds the maximum allowed size`
    );
  });

  test('should handle files with special characters in name', async () => {
    const specialContent = 'File with special name';
    const blob = new Blob([specialContent], { type: 'text/plain' });
    const file = new File([blob], 'test file (1) [copy].txt', {
      type: 'text/plain'
    });

    const response = await uploadFile(file, token);

    expect(response.status).toBe(200);

    const data = (await response.json()) as TTempFile;

    expect(data.originalName).toBe('test file (1) [copy].txt');
    expect(await fs.exists(data.path)).toBe(true);
  });

  test('should handle empty files', async () => {
    const blob = new Blob([], { type: 'text/plain' });
    const file = new File([blob], 'empty.txt', { type: 'text/plain' });

    const response = await uploadFile(file, token);

    expect(response.status).toBe(200);

    const data = (await response.json()) as TTempFile;

    expect(data.size).toBe(0);
    expect(await fs.exists(data.path)).toBe(true);
  });

  test('should handle different file types', async () => {
    // Test with a JSON file
    const jsonContent = JSON.stringify({ test: true });
    const jsonBlob = new Blob([jsonContent], { type: 'application/json' });
    const jsonFile = new File([jsonBlob], 'data.json', {
      type: 'application/json'
    });

    const response = await uploadFile(jsonFile, token);

    expect(response.status).toBe(200);

    const data = (await response.json()) as TTempFile;

    expect(data.extension).toBe('.json');
    expect(data.originalName).toBe('data.json');
    expect(await fs.exists(data.path)).toBe(true);
  });

  test('should handle files with no extension', async () => {
    const blob = new Blob(['Makefile content'], { type: 'text/plain' });
    const file = new File([blob], 'Makefile', { type: 'text/plain' });

    const response = await uploadFile(file, token);

    expect(response.status).toBe(200);

    const data = (await response.json()) as TTempFile;

    expect(data.originalName).toBe('Makefile');
    expect(await fs.exists(data.path)).toBe(true);
  });

  test('should handle files with multiple dots in name', async () => {
    const blob = new Blob(['backup content'], { type: 'text/plain' });
    const file = new File([blob], 'file.backup.old.txt', {
      type: 'text/plain'
    });

    const response = await uploadFile(file, token);

    expect(response.status).toBe(200);

    const data = (await response.json()) as TTempFile;

    expect(data.originalName).toBe('file.backup.old.txt');
    expect(data.extension).toBe('.txt');
  });

  test('should handle very long filenames', async () => {
    const longName = 'a'.repeat(200) + '.txt';
    const blob = new Blob(['content'], { type: 'text/plain' });
    const file = new File([blob], longName, { type: 'text/plain' });

    const response = await uploadFile(file, token);

    expect(response.status).toBe(200);

    const data = (await response.json()) as TTempFile;

    expect(data.originalName).toBe(longName);
    expect(await fs.exists(data.path)).toBe(true);
  });

  test('should upload multiple files sequentially', async () => {
    const file1 = getMockFile('First file content');
    const file2 = getMockFile('Second file content');

    const response1 = await uploadFile(file1, token);
    expect(response1.status).toBe(200);
    const data1 = (await response1.json()) as TTempFile;

    const response2 = await uploadFile(file2, token);
    expect(response2.status).toBe(200);
    const data2 = (await response2.json()) as TTempFile;

    expect(data1.id).not.toBe(data2.id);
    expect(await fs.exists(data1.path)).toBe(true);
    expect(await fs.exists(data2.path)).toBe(true);
  });

  test('should generate unique MD5 hashes for different files', async () => {
    const file1 = getMockFile('Content A');
    const file2 = getMockFile('Content B');

    const response1 = await uploadFile(file1, token);
    const data1 = (await response1.json()) as TTempFile;

    const response2 = await uploadFile(file2, token);
    const data2 = (await response2.json()) as TTempFile;

    expect(data1.md5).not.toBe(data2.md5);
  });

  test('should set correct userId for uploaded file', async () => {
    const file = getMockFile('User association test');
    const response = await uploadFile(file, token);

    expect(response.status).toBe(200);

    const data = (await response.json()) as TTempFile;

    expect(data.userId).toBe(1); // testowner has ID 1
  });

  test('should handle binary files correctly', async () => {
    // Create a small binary file (simulating an image)
    const binaryData = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a
    ]);
    const blob = new Blob([binaryData], { type: 'image/png' });
    const file = new File([blob], 'image.png', { type: 'image/png' });

    const response = await uploadFile(file, token);

    expect(response.status).toBe(200);

    const data = (await response.json()) as TTempFile;

    expect(data.extension).toBe('.png');
    expect(data.size).toBe(8);
    expect(await fs.exists(data.path)).toBe(true);
  });

  test('should reject filenames with path traversal (../)', async () => {
    const content = 'path traversal attempt';

    const blob = new Blob([content], { type: 'text/plain' });
    const file = new File([blob], 'safe.txt', { type: 'text/plain' });

    const response = await fetch(`${testsBaseUrl}/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        [UploadHeaders.TYPE]: file.type,
        [UploadHeaders.CONTENT_LENGTH]: file.size.toString(),
        [UploadHeaders.ORIGINAL_NAME]: '../../../etc/passwd',
        [UploadHeaders.TOKEN]: token
      },
      body: file
    });

    expect(response.status).toBe(200);

    const data = (await response.json()) as TTempFile;

    // path traversal should be stripped, leaving just 'passwd'
    expect(data.originalName).toBe('passwd');
    expect(data.path.startsWith(TMP_PATH)).toBe(true);
  });

  test('should reject filenames with absolute paths', async () => {
    const content = 'absolute path attempt';
    const blob = new Blob([content], { type: 'text/plain' });
    const file = new File([blob], 'safe.txt', { type: 'text/plain' });

    const response = await fetch(`${testsBaseUrl}/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        [UploadHeaders.TYPE]: file.type,
        [UploadHeaders.CONTENT_LENGTH]: file.size.toString(),
        [UploadHeaders.ORIGINAL_NAME]: '/etc/shadow',
        [UploadHeaders.TOKEN]: token
      },
      body: file
    });

    expect(response.status).toBe(200);

    const data = (await response.json()) as TTempFile;

    // absolute path should be stripped to just the basename
    expect(data.originalName).toBe('shadow');
    expect(data.path.startsWith(TMP_PATH)).toBe(true);
  });

  test('should reject filenames with null bytes at the HTTP client level', async () => {
    // null bytes in HTTP headers are rejected by the fetch/HTTP client before
    // reaching the server. The sanitizeFileName function provides defense-in-depth
    // for any non-standard HTTP clients that might bypass this restriction.
    const content = 'null byte attempt';

    const blob = new Blob([content], { type: 'text/plain' });
    const file = new File([blob], 'safe.txt', { type: 'text/plain' });

    expect(() =>
      fetch(`${testsBaseUrl}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          [UploadHeaders.TYPE]: file.type,
          [UploadHeaders.CONTENT_LENGTH]: file.size.toString(),
          [UploadHeaders.ORIGINAL_NAME]: 'malicious\0.txt',
          [UploadHeaders.TOKEN]: token
        },
        body: file
      })
    ).toThrow();
  });

  test('should reject dot-dot filename', async () => {
    const content = 'dot dot attempt';

    const blob = new Blob([content], { type: 'text/plain' });
    const file = new File([blob], 'safe.txt', { type: 'text/plain' });

    const response = await fetch(`${testsBaseUrl}/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        [UploadHeaders.TYPE]: file.type,
        [UploadHeaders.CONTENT_LENGTH]: file.size.toString(),
        [UploadHeaders.ORIGINAL_NAME]: '..',
        [UploadHeaders.TOKEN]: token
      },
      body: file
    });

    expect(response.status).toBe(400);

    const data: any = await response.json();

    expect(data).toHaveProperty('error', 'Invalid file name');
  });

  test('should strip Windows-style path traversal', async () => {
    const content = 'windows path attempt';

    const blob = new Blob([content], { type: 'text/plain' });
    const file = new File([blob], 'safe.txt', { type: 'text/plain' });

    const response = await fetch(`${testsBaseUrl}/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        [UploadHeaders.TYPE]: file.type,
        [UploadHeaders.CONTENT_LENGTH]: file.size.toString(),
        [UploadHeaders.ORIGINAL_NAME]: '..\\..\\windows\\system32\\config.txt',
        [UploadHeaders.TOKEN]: token
      },
      body: file
    });

    expect(response.status).toBe(200);

    const data = (await response.json()) as TTempFile;

    expect(data.originalName).toBe('config.txt');
    expect(data.originalName).not.toContain('..');
    expect(data.originalName).not.toContain('\\');
    expect(data.path.startsWith(TMP_PATH)).toBe(true);
  });

  test('should ensure uploaded file stays within upload directory', async () => {
    const content = 'escape attempt';
    const blob = new Blob([content], { type: 'text/plain' });
    const file = new File([blob], 'safe.txt', { type: 'text/plain' });

    const traversalNames = [
      '../../../etc/cron.d/evil',
      '../../malicious.sh',
      '../upload.ts',
      'foo/../../../bar.txt'
    ];

    for (const name of traversalNames) {
      const response = await fetch(`${testsBaseUrl}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          [UploadHeaders.TYPE]: file.type,
          [UploadHeaders.CONTENT_LENGTH]: file.size.toString(),
          [UploadHeaders.ORIGINAL_NAME]: name,
          [UploadHeaders.TOKEN]: token
        },
        body: file
      });

      expect(response.status).toBe(200);

      const data = (await response.json()) as TTempFile;

      expect(data.path.startsWith(TMP_PATH)).toBe(true);
      expect(data.originalName).not.toContain('..');
      expect(data.originalName).not.toContain('/');
    }
  });
});

describe('sanitizeFileName', () => {
  test('should return basename for normal filenames', () => {
    expect(sanitizeFileName('test.txt')).toBe('test.txt');
    expect(sanitizeFileName('photo.png')).toBe('photo.png');
    expect(sanitizeFileName('Makefile')).toBe('Makefile');
  });

  test('should strip directory traversal components', () => {
    expect(sanitizeFileName('../../../etc/passwd')).toBe('passwd');
    expect(sanitizeFileName('../../secret.txt')).toBe('secret.txt');
    expect(sanitizeFileName('/etc/shadow')).toBe('shadow');
    expect(sanitizeFileName('foo/../bar.txt')).toBe('bar.txt');
  });

  test('should return null for null bytes', () => {
    expect(sanitizeFileName('evil\0.txt')).toBeNull();
    expect(sanitizeFileName('\0')).toBeNull();
    expect(sanitizeFileName('file\0name.txt')).toBeNull();
  });

  test('should return null for dot-dot and dot names', () => {
    expect(sanitizeFileName('..')).toBeNull();
    expect(sanitizeFileName('.')).toBeNull();
  });

  test('should handle filenames with special characters', () => {
    expect(sanitizeFileName('test file (1).txt')).toBe('test file (1).txt');
    expect(sanitizeFileName('file[copy].txt')).toBe('file[copy].txt');
  });

  test('should handle filenames with multiple extensions', () => {
    expect(sanitizeFileName('file.backup.old.txt')).toBe('file.backup.old.txt');
  });
});
