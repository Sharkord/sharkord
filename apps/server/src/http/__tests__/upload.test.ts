import { UploadHeaders, type TTempFile } from '@sharkord/shared';
import { afterAll, beforeEach, describe, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import fs from 'fs/promises';
import net from 'net';
import path from 'path';
import { login, uploadFile } from '../../__tests__/helpers';
import { tdb, testsBaseUrl } from '../../__tests__/setup';
import { config } from '../../config';
import { settings, users } from '../../db/schema';
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

  test('should reject uploads from a banned user', async () => {
    const response = await login('testuser', 'password123');
    const data: any = await response.json();

    await tdb
      .update(users)
      .set({ banned: true, banReason: 'spam', bannedAt: Date.now() })
      .where(eq(users.identity, 'testuser'));

    const file = getMockFile('banned users should not be able to upload');
    const uploadResponse = await uploadFile(file, data.token);

    expect(uploadResponse.status).toBe(401);
  });

  test('should rate limit excessive upload attempts', async () => {
    const { maxRequests } = config.rateLimiters.upload;
    const statuses: number[] = [];

    for (let i = 0; i < maxRequests + 1; i++) {
      const file = getMockFile(`rate limit probe ${i}`);
      const response = await uploadFile(file, token);

      statuses.push(response.status);
    }

    expect(statuses.slice(0, maxRequests).every((s) => s === 200)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
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

  test('should refuse a body longer than the declared content-length', async () => {
    // fetch computes content-length from the body, so lying about
    // it needs a raw socket. the corrected finding claims the write stream cannot be fed past
    // the declared length: the parser frames the body at 5 bytes and answers the trailing
    // bytes as a malformed follow-on request rather than appending them to the upload
    const { port } = new URL(testsBaseUrl);

    const raw = await new Promise<string>((resolve, reject) => {
      const socket = net.connect(Number(port), 'localhost');
      let response = '';

      socket.on('data', (chunk) => {
        response += chunk.toString();
      });
      socket.on('error', reject);
      socket.on('close', () => resolve(response));

      socket.write(
        [
          'POST /upload HTTP/1.1',
          'Host: localhost',
          'Connection: close',
          'Content-Type: application/octet-stream',
          'Content-Length: 5',
          `${UploadHeaders.ORIGINAL_NAME}: overflow.txt`,
          `${UploadHeaders.TOKEN}: ${token}`,
          '',
          'hello, and then a lot more bytes that were never declared'
        ].join('\r\n')
      );
    });

    expect(raw).toContain('400 Bad Request');
  });

  test('should reject a non-numeric content-length', async () => {
    // NaN is not greater than storageUploadMaxFileSize, so a garbage header used to pass the
    // size check and land in the file row as the recorded size
    const { port } = new URL(testsBaseUrl);

    const raw = await new Promise<string>((resolve, reject) => {
      const socket = net.connect(Number(port), 'localhost');
      let response = '';

      socket.on('data', (chunk) => {
        response += chunk.toString();
      });
      socket.on('error', reject);
      socket.on('close', () => resolve(response));

      socket.write(
        [
          'POST /upload HTTP/1.1',
          'Host: localhost',
          'Connection: close',
          'Content-Length: not-a-number',
          `${UploadHeaders.ORIGINAL_NAME}: bogus.txt`,
          `${UploadHeaders.TOKEN}: ${token}`,
          '',
          ''
        ].join('\r\n')
      );
    });

    expect(raw).not.toContain('200 OK');
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

  test('should decode the percent-encoded names the client sends', () => {
    expect(sanitizeFileName('caf%C3%A9.png')).toBe('café.png');
    expect(sanitizeFileName('%E6%96%87%E6%9B%B8.png')).toBe('文書.png');
    expect(sanitizeFileName('%D0%BF%D1%80%D0%B8%D0%B2%D0%B5%D1%82.txt')).toBe(
      'привет.txt'
    );
    expect(sanitizeFileName('my%20report.pdf')).toBe('my report.pdf');
  });

  test('should strip traversal and null bytes hidden behind percent-encoding', () => {
    expect(sanitizeFileName('..%2F..%2Fetc%2Fpasswd')).toBe('passwd');
    expect(sanitizeFileName('%2E%2E%2F%2E%2E%2Fshadow')).toBe('shadow');
    expect(sanitizeFileName('%2E%2E')).toBeNull();
    expect(sanitizeFileName('evil%00.txt')).toBeNull();
  });

  test('should keep names a malformed escape makes undecodable', () => {
    expect(sanitizeFileName('100%.txt')).toBe('100%.txt');
    expect(sanitizeFileName('50%off%.png')).toBe('50%off%.png');
  });
});
