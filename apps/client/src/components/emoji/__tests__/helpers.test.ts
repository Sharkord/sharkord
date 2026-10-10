import type { TFile } from '@sharkord/shared';
import { describe, expect, test } from 'bun:test';
import { findGitHubEmoji } from '../helpers';

describe('findGitHubEmoji', () => {
  test('should find an emoji by its name', () => {
    expect(findGitHubEmoji('smile', null)?.emoji).toBe('😄');
  });

  test('should find an emoji by any of its shortcodes', () => {
    expect(findGitHubEmoji('+1', null)?.emoji).toBe('👍');
  });

  // a plugin reaction can arrive as the character itself, not a shortcode
  test('should find an emoji by its raw character', () => {
    expect(findGitHubEmoji('🔊', null)?.name).toBe('loud_sound');
  });

  // these render through the fallback image, so the match must still happen
  test('should find a text presentation emoji by its raw character', () => {
    expect(findGitHubEmoji('©', null)?.name).toBe('copyright');
  });

  test('should find nothing for a custom server emoji name', () => {
    expect(findGitHubEmoji('server_only_emoji', null)).toBeUndefined();
  });

  // a custom emoji named after a built-in one must render as itself
  test('should leave a custom emoji with a file to the file, even on a built-in name', () => {
    const customOm = { id: 1, name: 'om.webp' } as TFile;

    expect(findGitHubEmoji('om', null)?.name).toBe('om');
    expect(findGitHubEmoji('om', customOm)).toBeUndefined();
  });
});
