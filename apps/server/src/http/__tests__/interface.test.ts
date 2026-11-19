import { beforeAll, describe, expect, test } from 'bun:test';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { testsBaseUrl } from '../../__tests__/setup';
import { INTERFACE_PATH } from '../../helpers/paths';

const COMPRESSED_SOURCE = 'console.log("compressed");\n'.repeat(100);

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

    const hashedJsPath = path.join(assetsDir, 'main-a1b2c3ef.js');

    if (!fs.existsSync(hashedJsPath)) {
      fs.writeFileSync(hashedJsPath, 'console.log("hashed");');
    }

    const hashedCssPath = path.join(assetsDir, 'style-D4e_5F-8.css');

    if (!fs.existsSync(hashedCssPath)) {
      fs.writeFileSync(hashedCssPath, 'body { color: red; }');
    }

    const hashedOutsideAssetsPath = path.join(
      testInterfacePath,
      'logo-a1b2c3ef.js'
    );

    if (!fs.existsSync(hashedOutsideAssetsPath)) {
      fs.writeFileSync(hashedOutsideAssetsPath, 'console.log("public");');
    }

    const dotHashedPath = path.join(assetsDir, 'legacy.a1b2c3ef.js');

    if (!fs.existsSync(dotHashedPath)) {
      fs.writeFileSync(dotHashedPath, 'console.log("legacy");');
    }

    const compressedPath = path.join(assetsDir, 'compressed-Ab3_x9Zq.js');

    if (!fs.existsSync(compressedPath)) {
      fs.writeFileSync(compressedPath, COMPRESSED_SOURCE);
      fs.writeFileSync(
        `${compressedPath}.br`,
        zlib.brotliCompressSync(COMPRESSED_SOURCE)
      );
      fs.writeFileSync(
        `${compressedPath}.gz`,
        zlib.gzipSync(COMPRESSED_SOURCE)
      );
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

  test('should include ETag and Last-Modified on normal responses', async () => {
    const response = await fetch(`${testsBaseUrl}/index.html`);

    expect(response.status).toBe(200);
    expect(response.headers.get('ETag')).toBeDefined();
    expect(response.headers.get('Last-Modified')).toBeDefined();
  });

  test('should use no-cache policy for non-hashed files', async () => {
    const response = await fetch(`${testsBaseUrl}/index.html`);

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-cache');
  });

  test('should use immutable policy for hashed asset files', async () => {
    const response = await fetch(`${testsBaseUrl}/assets/main-a1b2c3ef.js`);

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe(
      'public, max-age=31536000, immutable'
    );
  });

  test('should use immutable policy for hashed CSS files', async () => {
    const response = await fetch(`${testsBaseUrl}/assets/style-D4e_5F-8.css`);

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe(
      'public, max-age=31536000, immutable'
    );
  });

  test('should use no-cache policy for non-hashed asset files', async () => {
    const response = await fetch(`${testsBaseUrl}/assets/test.js`);

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-cache');
  });

  test('should use no-cache policy for hash shaped files outside assets', async () => {
    const response = await fetch(`${testsBaseUrl}/logo-a1b2c3ef.js`);

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-cache');
  });

  test('should use no-cache policy for names vite never writes', async () => {
    const response = await fetch(`${testsBaseUrl}/assets/legacy.a1b2c3ef.js`);

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-cache');
  });

  test('should serve the brotli file when the client accepts it', async () => {
    const response = await fetch(
      `${testsBaseUrl}/assets/compressed-Ab3_x9Zq.js`,
      {
        headers: { 'Accept-Encoding': 'gzip, deflate, br' },
        decompress: false
      }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Encoding')).toBe('br');
    expect(response.headers.get('Vary')).toContain('Accept-Encoding');
    expect(response.headers.get('Content-Type')).toContain('javascript');
    expect(response.headers.get('Cache-Control')).toBe(
      'public, max-age=31536000, immutable'
    );

    const body = Buffer.from(await response.arrayBuffer());

    expect(zlib.brotliDecompressSync(body).toString()).toBe(COMPRESSED_SOURCE);
  });

  test('should serve the gzip file when brotli is not accepted', async () => {
    const response = await fetch(
      `${testsBaseUrl}/assets/compressed-Ab3_x9Zq.js`,
      { headers: { 'Accept-Encoding': 'gzip, deflate' }, decompress: false }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Encoding')).toBe('gzip');

    const body = Buffer.from(await response.arrayBuffer());

    expect(zlib.gunzipSync(body).toString()).toBe(COMPRESSED_SOURCE);
  });

  test('should not use an encoding the client refuses with q=0', async () => {
    const response = await fetch(
      `${testsBaseUrl}/assets/compressed-Ab3_x9Zq.js`,
      { headers: { 'Accept-Encoding': 'br;q=0, gzip' }, decompress: false }
    );

    expect(response.headers.get('Content-Encoding')).toBe('gzip');
  });

  test('should serve the plain file with vary when no encoding is accepted', async () => {
    const response = await fetch(
      `${testsBaseUrl}/assets/compressed-Ab3_x9Zq.js`,
      { headers: { 'Accept-Encoding': 'identity' }, decompress: false }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Encoding')).toBeNull();
    expect(response.headers.get('Vary')).toContain('Accept-Encoding');
    expect(await response.text()).toBe(COMPRESSED_SOURCE);
  });

  test('should answer range requests from the plain file', async () => {
    const response = await fetch(
      `${testsBaseUrl}/assets/compressed-Ab3_x9Zq.js`,
      {
        headers: { 'Accept-Encoding': 'br', Range: 'bytes=0-6' },
        decompress: false
      }
    );

    expect(response.status).toBe(206);
    expect(response.headers.get('Content-Encoding')).toBeNull();
    expect(await response.text()).toBe('console');
  });

  test('should give each encoding its own etag', async () => {
    const brotli = await fetch(
      `${testsBaseUrl}/assets/compressed-Ab3_x9Zq.js`,
      { headers: { 'Accept-Encoding': 'br' }, decompress: false }
    );
    const plain = await fetch(`${testsBaseUrl}/assets/compressed-Ab3_x9Zq.js`, {
      headers: { 'Accept-Encoding': 'identity' },
      decompress: false
    });

    expect(brotli.headers.get('ETag')).not.toBe(plain.headers.get('ETag'));
  });

  test('should keep the encoding vary on a 304', async () => {
    const first = await fetch(`${testsBaseUrl}/assets/compressed-Ab3_x9Zq.js`, {
      headers: { 'Accept-Encoding': 'br' },
      decompress: false
    });
    const etag = first.headers.get('ETag');

    const second = await fetch(
      `${testsBaseUrl}/assets/compressed-Ab3_x9Zq.js`,
      {
        headers: { 'Accept-Encoding': 'br', 'If-None-Match': etag! },
        decompress: false
      }
    );

    expect(second.status).toBe(304);
    expect(second.headers.get('Vary')).toContain('Accept-Encoding');
  });

  test('should return 304 when If-None-Match matches ETag', async () => {
    const firstResponse = await fetch(`${testsBaseUrl}/index.html`);
    const etag = firstResponse.headers.get('ETag');

    expect(firstResponse.status).toBe(200);
    expect(etag).toBeDefined();

    const secondResponse = await fetch(`${testsBaseUrl}/index.html`, {
      headers: { 'If-None-Match': etag! }
    });

    expect(secondResponse.status).toBe(304);
    expect(secondResponse.headers.get('ETag')).toBe(etag);
    expect(secondResponse.headers.get('Cache-Control')).toBe('no-cache');

    const body = await secondResponse.text();

    expect(body).toBe('');
  });

  test('should return 304 when If-Modified-Since matches Last-Modified', async () => {
    const firstResponse = await fetch(`${testsBaseUrl}/index.html`);
    const lastModified = firstResponse.headers.get('Last-Modified');

    expect(firstResponse.status).toBe(200);
    expect(lastModified).toBeDefined();

    const secondResponse = await fetch(`${testsBaseUrl}/index.html`, {
      headers: { 'If-Modified-Since': lastModified! }
    });

    expect(secondResponse.status).toBe(304);
    expect(secondResponse.headers.get('Last-Modified')).toBe(lastModified);
  });

  test('should return 304 with immutable cache policy for hashed assets', async () => {
    const firstResponse = await fetch(
      `${testsBaseUrl}/assets/main-a1b2c3ef.js`
    );
    const etag = firstResponse.headers.get('ETag');

    expect(firstResponse.status).toBe(200);
    expect(etag).toBeDefined();

    const secondResponse = await fetch(
      `${testsBaseUrl}/assets/main-a1b2c3ef.js`,
      { headers: { 'If-None-Match': etag! } }
    );

    expect(secondResponse.status).toBe(304);
    expect(secondResponse.headers.get('Cache-Control')).toBe(
      'public, max-age=31536000, immutable'
    );
  });

  test('should return no-store on 404 responses', async () => {
    const response = await fetch(`${testsBaseUrl}/non-existent-file.html`);

    expect(response.status).toBe(404);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  test('should return no-store on 403 responses', async () => {
    const response = await fetch(
      `${testsBaseUrl}/${encodeURIComponent('../../../etc/passwd')}`
    );

    expect(response.status).toBe(403);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  test('should send the csp report-only and never the enforcing header', async () => {
    const response = await fetch(`${testsBaseUrl}/`);
    const policy = response.headers.get('Content-Security-Policy-Report-Only');

    expect(response.headers.get('Content-Security-Policy')).toBeNull();
    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("script-src 'self' blob:");
    expect(policy).toContain('https://raw.githubusercontent.com');
  });

  test('should send the framing and referrer headers on every response', async () => {
    const response = await fetch(`${testsBaseUrl}/non-existent-file.html`);

    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    expect(response.headers.get('Referrer-Policy')).toBe(
      'strict-origin-when-cross-origin'
    );
  });
});
