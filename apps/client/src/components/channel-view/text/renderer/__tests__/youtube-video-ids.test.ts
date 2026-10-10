import { describe, expect, test } from 'bun:test';
import { extractYoutubeVideoIds } from '../helpers';

describe('extractYoutubeVideoIds', () => {
  test('should find youtube links nested inside a paragraph', () => {
    const ids = extractYoutubeVideoIds(
      '<p>look <a href="https://youtu.be/abc123">here</a> and <strong><a href="https://www.youtube.com/watch?v=def456">here</a></strong></p>'
    );

    expect(ids).toEqual(['abc123', 'def456']);
  });

  test('should return each video once', () => {
    const ids = extractYoutubeVideoIds(
      '<p><a href="https://youtu.be/abc123">a</a> <a href="https://www.youtube.com/watch?v=abc123">b</a></p>'
    );

    expect(ids).toEqual(['abc123']);
  });

  test('should ignore other links and invalid hrefs', () => {
    const ids = extractYoutubeVideoIds(
      '<p><a href="https://example.com">a</a> <a href="not a url">b</a></p>'
    );

    expect(ids).toEqual([]);
  });
});
