import { afterEach, describe, expect, test } from 'bun:test';
import { fetchServer } from '../fetch-server';

type TStub = ReturnType<typeof Bun.serve>;

const stubs: TStub[] = [];

const startServer = (handler: (req: Request) => Response) => {
  const stub = Bun.serve({ port: 0, fetch: handler });

  stubs.push(stub);

  return `http://localhost:${stub.port}`;
};

describe('fetchServer', () => {
  afterEach(async () => {
    for (const stub of stubs) {
      await stub.stop(true);
    }

    stubs.length = 0;
  });

  test('describes a server from its info', async () => {
    const origin = startServer(() =>
      Response.json({ serverId: 'abc', name: 'Home', logo: null })
    );

    expect(await fetchServer(origin, fetch)).toEqual({
      id: 'abc',
      name: 'Home',
      url: origin,
      iconUrl: null
    });
  });

  test('points the icon at the public file of the logo', async () => {
    const origin = startServer(() =>
      Response.json({
        serverId: 'abc',
        name: 'Home',
        logo: { name: 'my logo.png' }
      })
    );

    const server = await fetchServer(origin, fetch);

    expect(server?.iconUrl).toBe(`${origin}/public/my%20logo.png`);
  });

  test('appends the access token of a protected logo', async () => {
    const origin = startServer(() =>
      Response.json({
        serverId: 'abc',
        name: 'Home',
        logo: { name: 'logo.png', _accessToken: 'secret' }
      })
    );

    const server = await fetchServer(origin, fetch);

    expect(server?.iconUrl).toBe(
      `${origin}/public/logo.png?accessToken=secret`
    );
  });

  test('is null when the address answers with an error', async () => {
    const origin = startServer(() => new Response('nope', { status: 500 }));

    expect(await fetchServer(origin, fetch)).toBeNull();
  });

  test('is null when the address is not a sharkord server', async () => {
    const origin = startServer(() => Response.json({ hello: 'world' }));

    expect(await fetchServer(origin, fetch)).toBeNull();
  });

  test('is null when the response is not json', async () => {
    const origin = startServer(() => new Response('<html></html>'));

    expect(await fetchServer(origin, fetch)).toBeNull();
  });

  test('is null when nothing is listening', async () => {
    const origin = startServer(() => new Response('ok'));

    await stubs[0]?.stop(true);

    expect(await fetchServer(origin, fetch)).toBeNull();
  });
});
