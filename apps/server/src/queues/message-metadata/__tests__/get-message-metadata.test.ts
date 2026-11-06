import { beforeEach, describe, expect, spyOn, test } from 'bun:test';
import dns from 'dns';
import { eq } from 'drizzle-orm';
import { tdb } from '../../../__tests__/setup';
import { messages } from '../../../db/schema';
import { processMessageMetadata } from '../get-message-metadata';
import { createOpenGraphMetadata, getDirectMediaMetaFromUrl } from '../helpers';

const insertMessage = async (content: string) => {
  const [row] = await tdb
    .insert(messages)
    .values({
      channelId: 1,
      userId: 1,
      content,
      metadata: null,
      createdAt: Date.now()
    })
    .returning();

  return row!.id;
};

const storedMetadata = async (messageId: number) => {
  const row = await tdb
    .select({ metadata: messages.metadata })
    .from(messages)
    .where(eq(messages.id, messageId))
    .get();

  return row?.metadata ?? null;
};

// a literal address is refused before anything is fetched, and a media extension resolves from
// the url alone, so both sides of this run without touching the network. what cannot be tested
// here is the dns path, which needs a hostname that really resolves into a reserved range
describe('link preview ssrf guard', () => {
  test('should refuse a link pointing straight at a private address', async () => {
    const content = 'look at http://10.0.0.1/photo.png';
    const messageId = await insertMessage(content);

    const result = await processMessageMetadata(content, messageId);

    expect(result).toBeUndefined();
    expect(await storedMetadata(messageId)).toBeNull();
  });

  test('should refuse a link pointing at the carrier grade nat range', async () => {
    const content = 'look at http://100.64.0.1/photo.png';
    const messageId = await insertMessage(content);

    const result = await processMessageMetadata(content, messageId);

    expect(result).toBeUndefined();
    expect(await storedMetadata(messageId)).toBeNull();
  });

  test('should refuse a link pointing at the cloud metadata endpoint', async () => {
    const content = 'look at http://169.254.169.254/latest/meta-data.png';
    const messageId = await insertMessage(content);

    const result = await processMessageMetadata(content, messageId);

    expect(result).toBeUndefined();
    expect(await storedMetadata(messageId)).toBeNull();
  });

  test('should still build metadata for a routable address', async () => {
    const content = 'look at http://93.184.216.34/photo.png';
    const messageId = await insertMessage(content);

    const result = await processMessageMetadata(content, messageId);

    expect(result).toBeDefined();
    expect(await storedMetadata(messageId)).not.toBeNull();
  });
});

const PREVIEW_HOST = 'preview.example';

const fakePages: Record<string, () => Response> = {
  [`https://${PREVIEW_HOST}/to-private`]: () =>
    Response.redirect('http://127.0.0.1/page', 302),
  [`https://${PREVIEW_HOST}/to-public`]: () =>
    Response.redirect(`https://${PREVIEW_HOST}/page`, 302),
  [`https://${PREVIEW_HOST}/page`]: () =>
    new Response('<html><head><title>fetched page</title></head></html>', {
      headers: { 'Content-Type': 'text/html' }
    }),
  'http://127.0.0.1/page': () =>
    new Response('<html><head><title>internal page</title></head></html>', {
      headers: { 'Content-Type': 'text/html' }
    })
};

// link-preview-js refuses hosts without a tld, so a local server cannot stand in for the
// remote one. fetch is faked instead, following redirects itself unless asked not to, the
// way the real one does, and dns makes the fake host look public while the loopback
// literal it redirects to resolves for real
describe('link preview redirects', () => {
  beforeEach(() => {
    const fakeFetch = async (
      input: string | URL | Request,
      init?: RequestInit
    ): Promise<Response> => {
      const page = fakePages[String(input)];

      if (!page) throw new Error(`unexpected fetch of ${String(input)}`);

      const response = page();
      const location = response.headers.get('location');

      if (location && init?.redirect !== 'manual') {
        return fakeFetch(location, init);
      }

      return response;
    };

    spyOn(globalThis, 'fetch').mockImplementation(fakeFetch as typeof fetch);

    const originalLookup = dns.lookup.bind(dns);

    spyOn(dns, 'lookup').mockImplementation(((
      hostname: string,
      options: dns.LookupAllOptions,
      callback: (
        error: NodeJS.ErrnoException | null,
        addresses: dns.LookupAddress[]
      ) => void
    ) => {
      if (hostname === PREVIEW_HOST) {
        callback(null, [{ address: '93.184.216.34', family: 4 }]);

        return;
      }

      originalLookup(hostname, options, callback);
    }) as typeof dns.lookup);
  });

  test('should refuse a public link that redirects to a private address', async () => {
    const content = `look at https://${PREVIEW_HOST}/to-private`;
    const messageId = await insertMessage(content);

    const result = await processMessageMetadata(content, messageId);

    expect(result).toBeUndefined();
    expect(await storedMetadata(messageId)).toBeNull();
  });

  test('should follow a redirect that stays on a public address', async () => {
    const content = `look at https://${PREVIEW_HOST}/to-public`;
    const messageId = await insertMessage(content);

    await processMessageMetadata(content, messageId);

    const metadata = await storedMetadata(messageId);

    expect(metadata?.[0]).toMatchObject({
      kind: 'open_graph',
      title: 'fetched page'
    });
  });
});

describe('message metadata normalization', () => {
  test('normalizes link-preview-js style previews into open graph metadata', () => {
    const metadata = createOpenGraphMetadata(
      {
        title: 'Example page',
        siteName: 'Example',
        description: 'A useful preview.',
        mediaType: 'website',
        images: ['https://example.com/cover.png'],
        favicons: ['https://example.com/favicon.ico']
      },
      'https://example.com/article'
    );

    expect(metadata).toEqual({
      kind: 'open_graph',
      url: 'https://example.com/article',
      title: 'Example page',
      siteName: 'Example',
      description: 'A useful preview.',
      mediaType: 'website',
      images: ['https://example.com/cover.png'],
      videos: undefined,
      favicons: ['https://example.com/favicon.ico']
    });
  });

  test('normalizes open-graph-scraper style previews and resolves relative urls', () => {
    const metadata = createOpenGraphMetadata(
      {
        ogTitle: 'OG title',
        ogSiteName: 'OG site',
        ogDescription: 'OG description',
        ogType: 'article',
        ogImage: [{ url: '/cover.png' }],
        favicon: '/favicon.ico'
      },
      'https://example.com/posts/123'
    );

    expect(metadata).toEqual({
      kind: 'open_graph',
      url: 'https://example.com/posts/123',
      title: 'OG title',
      siteName: 'OG site',
      description: 'OG description',
      mediaType: 'article',
      images: ['https://example.com/cover.png'],
      videos: undefined,
      favicons: ['https://example.com/favicon.ico']
    });
  });

  test('drops image, video and favicon urls that are not http or https', () => {
    const metadata = createOpenGraphMetadata(
      {
        title: 'Example page',
        images: ['javascript:alert(1)', 'https://example.com/cover.png'],
        videos: ['data:video/mp4;base64,AAAA'],
        favicons: ['data:image/png;base64,AAAA', 'file:///etc/passwd']
      },
      'https://example.com/article'
    );

    expect(metadata?.images).toEqual(['https://example.com/cover.png']);
    expect(metadata?.videos).toBeUndefined();
    expect(metadata?.favicons).toBeUndefined();
  });

  test('skips previews without renderable open graph content', () => {
    const metadata = createOpenGraphMetadata(
      {
        mediaType: 'website'
      },
      'https://example.com/article'
    );

    expect(metadata).toBeUndefined();
  });

  test('detects direct media links from file extensions', () => {
    expect(
      getDirectMediaMetaFromUrl(new URL('https://example.com/photo.jpeg'))
    ).toEqual({
      isDirectMediaLink: true,
      mediaType: 'image'
    });

    expect(
      getDirectMediaMetaFromUrl(new URL('https://example.com/page'))
    ).toEqual({
      isDirectMediaLink: false,
      mediaType: 'none'
    });
  });
});
