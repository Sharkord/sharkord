import { describe, expect, test } from 'bun:test';
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
