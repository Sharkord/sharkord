import { gitHubEmojis } from '@tiptap/extension-emoji';
import { describe, expect, test } from 'bun:test';
import {
  mergeEmojis,
  withoutShadowedEmojis,
  type TEmojiItem
} from '../helpers';

const builtIn = (name: string): TEmojiItem => {
  const emoji = gitHubEmojis.find((e) => e.name === name)!;

  return {
    name: emoji.name,
    shortcodes: emoji.shortcodes,
    fallbackImage: emoji.fallbackImage,
    emoji: emoji.emoji
  };
};

const custom = (name: string): TEmojiItem => ({
  name,
  shortcodes: [name],
  fallbackImage: `/public/emojis/${name}.webp`
});

const builtInOm = builtIn('om');
const builtInSmile = builtIn('smile');
const customOm = custom('om');

describe('withoutShadowedEmojis', () => {
  test('should drop a built-in emoji whose name a custom emoji has taken', () => {
    expect(
      withoutShadowedEmojis([builtInOm, builtInSmile], [customOm])
    ).toEqual([builtInSmile]);
  });

  // the built-in set gives an emoji several shortcodes, and any of them resolves
  // back to it, so a custom emoji named after the secondary one shadows it too
  test('should drop a built-in emoji matched by a secondary shortcode', () => {
    const secondary = builtInSmile.shortcodes.find(
      (shortcode) => shortcode !== builtInSmile.name
    )!;

    expect(
      withoutShadowedEmojis([builtInOm, builtInSmile], [custom(secondary)])
    ).toEqual([builtInOm]);
  });

  test('should keep every built-in emoji when no name collides', () => {
    expect(
      withoutShadowedEmojis([builtInOm, builtInSmile], [custom('blob')])
    ).toEqual([builtInOm, builtInSmile]);
  });

  test('should return the built-in emojis untouched without custom emojis', () => {
    expect(withoutShadowedEmojis([builtInOm, builtInSmile], [])).toEqual([
      builtInOm,
      builtInSmile
    ]);
  });

  // the recent list mixes custom emojis in, and a custom emoji's own name is
  // always taken, so filtering it must only ever drop the built-ins
  test('should keep custom emojis in a mixed list such as recents', () => {
    const customBlob = custom('blob');

    expect(
      withoutShadowedEmojis(
        [customOm, builtInOm, customBlob, builtInSmile],
        [customOm, customBlob]
      )
    ).toEqual([customOm, customBlob, builtInSmile]);
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
    const customBlob = custom('blob');

    expect(mergeEmojis([builtInSmile], [customBlob])).toEqual([
      customBlob,
      builtInSmile
    ]);
  });
});
