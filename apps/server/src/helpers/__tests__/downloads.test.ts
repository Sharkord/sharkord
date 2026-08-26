import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { downloadFile } from '../downloads';

const MAX_DOWNLOAD_BYTES = 20 * 1024 * 1024;

const CHUNK = new Uint8Array(1024 * 1024);

// pull driven rather than pushed up front, so a client that gives up early stops the body
// being produced at all and the cap is reached rather than buffered
const oversizedStream = () => {
  let sent = 0;

  return new ReadableStream({
    pull(controller) {
      if (sent > MAX_DOWNLOAD_BYTES) {
        controller.close();

        return;
      }

      sent += CHUNK.byteLength;
      controller.enqueue(CHUNK);
    }
  });
};

let server: ReturnType<typeof Bun.serve>;
let liar: Bun.TCPSocketListener;
let outputDir: string;

const url = (route: string) => `${server.url.origin}${route}`;
const outputPath = (name: string) => path.join(outputDir, name);

beforeAll(async () => {
  outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sharkord-downloads-'));

  // Bun.serve recomputes content-length, so the header check needs a server that will send a
  // length the body does not match. anything oversized enough to be caught by the running
  // total instead would prove nothing about the header
  liar = Bun.listen({
    hostname: '127.0.0.1',
    port: 0,
    socket: {
      data(socket) {
        socket.write(
          `HTTP/1.1 200 OK\r\nContent-Length: ${MAX_DOWNLOAD_BYTES + 1}\r\n\r\n`
        );
        socket.write(CHUNK.subarray(0, 16));
        socket.end();
      }
    }
  });

  server = Bun.serve({
    port: 0,
    idleTimeout: 30,
    fetch(request) {
      const { pathname } = new URL(request.url);

      if (pathname === '/small') {
        return new Response('plugin archive bytes');
      }

      if (pathname === '/streamed-too-large') {
        return new Response(oversizedStream());
      }

      return new Response('nope', { status: 404, statusText: 'Not Found' });
    }
  });
});

afterAll(async () => {
  server.stop(true);
  liar.stop(true);
  await fs.rm(outputDir, { recursive: true, force: true });
});

describe('downloadFile', () => {
  test('should write a normal download to disk', async () => {
    const target = outputPath('small.archive');

    await downloadFile(url('/small'), target);

    expect(await Bun.file(target).text()).toBe('plugin archive bytes');
  });

  test('should refuse a download that declares a size past the cap', async () => {
    const target = outputPath('declared.archive');

    await expect(
      downloadFile(`http://127.0.0.1:${liar.port}/`, target)
    ).rejects.toThrow('Download exceeds the maximum allowed size');

    expect(await Bun.file(target).exists()).toBe(false);
  });

  // the header is the host's word for it, so the running total is the check that actually holds
  test('should refuse a download that grows past the cap without declaring it', async () => {
    const target = outputPath('streamed.archive');

    await expect(
      downloadFile(url('/streamed-too-large'), target)
    ).rejects.toThrow('Download exceeds the maximum allowed size');

    // M20's real requirement: a refused download leaves nothing behind to be picked up later
    expect(await Bun.file(target).exists()).toBe(false);
  });

  test('should refuse a download the host does not serve', async () => {
    const target = outputPath('missing.archive');

    await expect(downloadFile(url('/missing'), target)).rejects.toThrow(
      'Failed to download file: 404'
    );

    expect(await Bun.file(target).exists()).toBe(false);
  });
});
