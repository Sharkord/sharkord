import type { TMessageMetadata } from '@sharkord/shared';
import { beforeEach, describe, expect, spyOn, test } from 'bun:test';
import * as serverQueries from '../../db/queries/server';
import {
  buildMediaProxyUrl,
  proxyMessageMetadata,
  verifyMediaUrl
} from '../media-proxy';

const getSignature = (proxyUrl: string) => {
  const parsed = new URL(proxyUrl, 'http://server.test');

  return {
    pathname: parsed.pathname,
    url: parsed.searchParams.get('url'),
    signature: parsed.searchParams.get('signature') ?? ''
  };
};

describe('media proxy urls', () => {
  beforeEach(() => {
    spyOn(serverQueries, 'getServerTokenSync').mockReturnValue(
      'test-server-token-12345'
    );
  });

  test('should build a proxy path whose signature verifies for that url only', () => {
    const { pathname, url, signature } = getSignature(
      buildMediaProxyUrl('https://media.example.com/cat.png')
    );

    expect(pathname).toBe('/media-proxy');
    expect(url).toBe('https://media.example.com/cat.png');
    expect(verifyMediaUrl('https://media.example.com/cat.png', signature)).toBe(
      true
    );
    expect(verifyMediaUrl('https://media.example.com/dog.png', signature)).toBe(
      false
    );
  });

  test('should refuse a signature of the wrong length', () => {
    expect(verifyMediaUrl('https://media.example.com/cat.png', 'abc')).toBe(
      false
    );
  });

  test('should add a proxy url to media and rewrite open graph images and favicons', () => {
    const metadata: TMessageMetadata[] = [
      {
        kind: 'media',
        url: 'https://media.example.com/cat.png',
        mediaType: 'image'
      },
      {
        kind: 'open_graph',
        url: 'https://blog.example.com/post',
        mediaType: 'website',
        images: ['https://blog.example.com/cover.jpg'],
        favicons: ['https://blog.example.com/favicon.ico']
      }
    ];

    const [media, openGraph] = proxyMessageMetadata(metadata)!;

    expect(media).toEqual({
      kind: 'media',
      url: 'https://media.example.com/cat.png',
      mediaType: 'image',
      proxyUrl: buildMediaProxyUrl('https://media.example.com/cat.png')
    });
    expect(openGraph).toEqual({
      kind: 'open_graph',
      url: 'https://blog.example.com/post',
      mediaType: 'website',
      images: [buildMediaProxyUrl('https://blog.example.com/cover.jpg')],
      favicons: [buildMediaProxyUrl('https://blog.example.com/favicon.ico')]
    });
  });

  test('should proxy a media row stored before kind existed', () => {
    const legacy = {
      url: 'https://media.example.com/clip.mp4',
      mediaType: 'video'
    } as TMessageMetadata;

    const [media] = proxyMessageMetadata([legacy])!;

    expect(media).toMatchObject({
      proxyUrl: buildMediaProxyUrl('https://media.example.com/clip.mp4')
    });
  });

  test('should leave a message without metadata alone', () => {
    expect(proxyMessageMetadata(null)).toBeNull();
  });
});
