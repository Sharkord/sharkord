import { describe, expect, test } from 'bun:test';
import { createOpenGraphMetadata, getDirectMediaMetaFromUrl } from '../helpers';

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
