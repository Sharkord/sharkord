import { describe, expect, test } from 'bun:test';
import {
  mergeEmojis,
  withoutShadowedEmojis,
  type TEmojiItem
} from '../helpers';

const builtInOm: TEmojiItem = {
  name: 'om',
  shortcodes: ['om', 'om_symbol'],
  emoji: '🕉️'
};

const builtInSmile: TEmojiItem = {
  name: 'smile',
  shortcodes: ['smile'],
  emoji: '😄'
};

const customOm: TEmojiItem = {
  name: 'om',
  shortcodes: ['om'],
  fallbackImage: '/public/emojis/om.webp'
};

describe('withoutShadowedEmojis', () => {
  test('should drop a built-in emoji whose name a custom emoji has taken', () => {
    expect(
      withoutShadowedEmojis([builtInOm, builtInSmile], [customOm])
    ).toEqual([builtInSmile]);
  });

  // the built-in set gives an emoji several shortcodes, and any of them resolves
  // back to it, so a custom emoji named after the secondary one shadows it too
  test('should drop a built-in emoji matched by a secondary shortcode', () => {
    const customOmSymbol: TEmojiItem = {
      name: 'om_symbol',
      shortcodes: ['om_symbol'],
      fallbackImage: '/public/emojis/om.webp'
    };

    expect(
      withoutShadowedEmojis([builtInOm, builtInSmile], [customOmSymbol])
    ).toEqual([builtInSmile]);
  });

  test('should keep every built-in emoji when no name collides', () => {
    const customBlob: TEmojiItem = {
      name: 'blob',
      shortcodes: ['blob'],
      fallbackImage: '/public/emojis/blob.webp'
    };

    expect(
      withoutShadowedEmojis([builtInOm, builtInSmile], [customBlob])
    ).toEqual([builtInOm, builtInSmile]);
  });

  test('should return the built-in emojis untouched without custom emojis', () => {
    expect(withoutShadowedEmojis([builtInOm, builtInSmile], [])).toEqual([
      builtInOm,
      builtInSmile
    ]);
  });
});

describe('mergeEmojis', () => {
  // tiptap keeps the first match for a shortcode, so the custom emoji has to come
  // first and the built-in one it shadows must be gone, otherwise picking the
  // custom emoji inserts the built-in character instead
  test('should resolve a shared shortcode to the custom emoji only', () => {
    const merged = mergeEmojis([builtInOm, builtInSmile], [customOm]);

    expect(merged).toEqual([customOm, builtInSmile]);
    expect(merged.filter(({ name }) => name === 'om')).toHaveLength(1);
  });

  test('should list custom emojis before the built-in ones', () => {
    const customBlob: TEmojiItem = {
      name: 'blob',
      shortcodes: ['blob'],
      fallbackImage: '/public/emojis/blob.webp'
    };

    expect(mergeEmojis([builtInSmile], [customBlob])).toEqual([
      customBlob,
      builtInSmile
    ]);
  });
});
