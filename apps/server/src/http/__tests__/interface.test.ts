import { beforeAll, describe, expect, test } from 'bun:test';
import fs from 'fs';
import path from 'path';
import { testsBaseUrl } from '../../__tests__/setup';
import { INTERFACE_PATH } from '../../helpers/paths';

describe('/interface', () => {
  const testInterfacePath = INTERFACE_PATH;

  // create a simple mock interface structure for testing
  beforeAll(() => {
    if (!fs.existsSync(testInterfacePath)) {
      fs.mkdirSync(testInterfacePath, { recursive: true });
    }

    const assetsDir = path.join(testInterfacePath, 'assets');

    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }

    const testJsPath = path.join(assetsDir, 'test.js');

    if (!fs.existsSync(testJsPath)) {
      fs.writeFileSync(testJsPath, 'console.log("test");');
    }

    const testCssPath = path.join(assetsDir, 'test.css');

    if (!fs.existsSync(testCssPath)) {
      fs.writeFileSync(testCssPath, 'body { margin: 0; }');
    }

    const fileWithSpaces = path.join(
      testInterfacePath,
      'test file with spaces.html'
    );

    if (!fs.existsSync(fileWithSpaces)) {
      fs.writeFileSync(fileWithSpaces, '<html><body>Spaces Test</body></html>');
    }

    const nestedDir = path.join(testInterfacePath, 'nested', 'deep');

    if (!fs.existsSync(nestedDir)) {
      fs.mkdirSync(nestedDir, { recursive: true });
    }

    const nestedFile = path.join(nestedDir, 'nested.txt');

    if (!fs.existsSync(nestedFile)) {
      fs.writeFileSync(nestedFile, 'nested content');
    }

    const noExtFile = path.join(testInterfacePath, 'CHANGELOG');

    if (!fs.existsSync(noExtFile)) {
      fs.writeFileSync(noExtFile, 'Version 1.0.0');
    }

    const testDir = path.join(testInterfacePath, 'testdir');

    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    const indexPath = path.join(testInterfacePath, 'index.html');

    if (!fs.existsSync(indexPath)) {
      fs.writeFileSync(
        indexPath,
        `<!DOCTYPE html>
<html>
<head>
  <title>Test</title>
  <link rel="stylesheet" href="/assets/test.css">
</head>
<body>
  <h1>Test Interface</h1>
  <script type="module" src="/assets/test.js"></script>
</body>
</html>`
      );
    }
  });

  test('should serve index.html when requesting root path', async () => {
    const response = await fetch(`${testsBaseUrl}/`);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/html');

    const text = await response.text();

    expect(text).toContain('Test Interface');
  });

  test('should serve index.html when explicitly requested', async () => {
    const response = await fetch(`${testsBaseUrl}/index.html`);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/html');

    const text = await response.text();

    expect(text).toContain('Test Interface');
  });

  test('should serve JavaScript files with correct content type', async () => {
    const response = await fetch(`${testsBaseUrl}/assets/test.js`);

    expect(response.status).toBe(200);

    const contentType = response.headers.get('Content-Type');

    expect(
      contentType?.includes('javascript') || contentType?.includes('text/plain')
    ).toBe(true);

    const text = await response.text();

    expect(text).toContain('console.log');
  });

  test('should serve CSS files with correct content type', async () => {
    const response = await fetch(`${testsBaseUrl}/assets/test.css`);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/css');

    const text = await response.text();

    expect(text).toContain('body');
  });

  test('should return 404 for non-existent files', async () => {
    const response = await fetch(`${testsBaseUrl}/non-existent-file.html`);

    expect(response.status).toBe(404);

    const data = await response.json();

    expect(data).toHaveProperty('error', 'Not found');
  });

  test('should return 404 for non-existent paths', async () => {
    const response = await fetch(`${testsBaseUrl}/fake/path/file.js`);

    expect(response.status).toBe(404);

    const data = await response.json();

    expect(data).toHaveProperty('error', 'Not found');
  });

  test('should prevent path traversal attacks', async () => {
    const response = await fetch(`${testsBaseUrl}/../../../etc/passwd`);

    expect([403, 404]).toContain(response.status);

    const data = await response.json();

    expect(data).toHaveProperty('error');
  });

  test('should prevent encoded path traversal attacks', async () => {
    const response = await fetch(
      `${testsBaseUrl}/${encodeURIComponent('../../../etc/passwd')}`
    );

    expect(response.status).toBe(403);

    const data = await response.json();

    expect(data).toHaveProperty('error', 'Forbidden');
  });

  test('should handle URL decoding correctly', async () => {
    const encodedFileName = encodeURIComponent('test file with spaces.html');
    const response = await fetch(`${testsBaseUrl}/${encodedFileName}`);

    expect(response.status).toBe(200);

    const text = await response.text();

    expect(text).toContain('Spaces Test');
  });

  test('should handle query parameters in URLs', async () => {
    const response = await fetch(
      `${testsBaseUrl}/index.html?v=123&cache=false`
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/html');

    const text = await response.text();

    expect(text).toContain('Test Interface');
  });

  test('should serve nested directory files', async () => {
    const response = await fetch(`${testsBaseUrl}/nested/deep/nested.txt`);

    expect(response.status).toBe(200);

    const text = await response.text();

    expect(text).toBe('nested content');
  });

  test('should handle files without extensions', async () => {
    const response = await fetch(`${testsBaseUrl}/CHANGELOG`);

    expect(response.status).toBe(200);

    const text = await response.text();

    expect(text).toBe('Version 1.0.0');
  });

  test('should set correct Content-Length header', async () => {
    const response = await fetch(`${testsBaseUrl}/index.html`);

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Length')).toBeTruthy();

    const contentLength = parseInt(
      response.headers.get('Content-Length') || '0'
    );

    const text = await response.text();

    expect(contentLength).toBe(text.length);
  });

  test('should handle empty URL path as root', async () => {
    const response = await fetch(`${testsBaseUrl}/`);

    expect(response.status).toBe(200);

    const text = await response.text();

    expect(text).toContain('Test Interface');
  });

  test('should reject paths with null bytes', async () => {
    const response = await fetch(`${testsBaseUrl}/test%00.html`);

    expect([403, 404]).toContain(response.status);
  });

  test('should handle trailing slashes correctly', async () => {
    const response = await fetch(`${testsBaseUrl}/testdir/`);

    expect(response.status).toBe(404);
  });
});
