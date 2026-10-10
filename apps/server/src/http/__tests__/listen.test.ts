import { describe, expect, test } from 'bun:test';
import type http from 'http';
import { createHttpServer } from '..';

const closeServer = (server: http.Server) =>
  new Promise<void>((resolve) => server.close(() => resolve()));

describe('createHttpServer host', () => {
  test('should only listen on the given host', async () => {
    const server = await createHttpServer(0, '127.0.0.1');
    const address = server.address();

    await closeServer(server);

    expect(address).not.toBeNull();
    expect(typeof address).not.toBe('string');
    expect((address as { address: string }).address).toBe('127.0.0.1');
  });

  test('should listen on every interface when no host is set', async () => {
    const server = await createHttpServer(0, '');
    const address = server.address();

    await closeServer(server);

    expect(['::', '0.0.0.0']).toContain(
      (address as { address: string }).address
    );
  });
});
