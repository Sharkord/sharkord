import { gitHubEmojis } from '@tiptap/extension-emoji';

type TEmojiItem = {
  name: string;
  shortcodes: string[];
  fallbackImage?: string;
  emoji?: string;
};

// checks if the emoji is likely to be rendered as a text presentation emoji, which often look worse and less consistent across platforms than image presentation emojis
const isTextPresentation = (emoji: string): boolean => {
  const codepoints = [...emoji];

  if (codepoints.length !== 1) return false;

  const cp = codepoints[0].codePointAt(0)!;

  return (
    cp <= 0x00ae ||
    (cp >= 0x2000 && cp <= 0x2bff) ||
    (cp >= 0x3000 && cp <= 0x33ff)
  );
};

// checks if the emoji should use the fallback image (if available) instead of the native emoji character
const shouldUseFallbackImage = (emoji: TEmojiItem): boolean =>
  !!emoji.fallbackImage && (!emoji.emoji || isTextPresentation(emoji.emoji));

type TShortcodedEmoji = Pick<
  TEmojiItem,
  'name' | 'shortcodes' | 'fallbackImage'
>;

const builtInImageByName = new Map(
  gitHubEmojis.map(({ name, fallbackImage }) => [name, fallbackImage])
);

// a custom emoji named after a built-in one never carries the built-in's image,
// so the image is what tells the two apart
const isBuiltInEmoji = ({ name, fallbackImage }: TShortcodedEmoji) =>
  builtInImageByName.has(name) &&
  builtInImageByName.get(name) === fallbackImage;

const getTakenShortcodes = (customEmojis: TShortcodedEmoji[]): Set<string> =>
  new Set(
    customEmojis.flatMap(({ name, shortcodes }) => [name, ...shortcodes])
  );

// a shortcode resolves to a single emoji everywhere downstream: tiptap stores only
// the name on the node and keeps the first match for it, and reactions resolve that
// same name against the custom emoji table. a built-in emoji whose shortcode a
// custom one has taken is therefore unreachable, so it is dropped from every list
// the user can pick from instead of being offered and inserting the custom emoji.
// only built-ins are dropped: the recent list mixes custom emojis in, and their
// own names are taken
const withoutShadowedEmojis = <TEmoji extends TShortcodedEmoji>(
  emojis: TEmoji[],
  customEmojis: TShortcodedEmoji[]
): TEmoji[] => {
  if (customEmojis.length === 0) return emojis;

  const takenShortcodes = getTakenShortcodes(customEmojis);

  return emojis.filter(
    (emoji) =>
      !isBuiltInEmoji(emoji) ||
      (!takenShortcodes.has(emoji.name) &&
        !emoji.shortcodes.some((shortcode) => takenShortcodes.has(shortcode)))
  );
};

const mergeEmojis = <
  TBuiltIn extends TShortcodedEmoji,
  TCustom extends TShortcodedEmoji
>(
  builtInEmojis: TBuiltIn[],
  customEmojis: TCustom[]
): (TBuiltIn | TCustom)[] => [
  ...customEmojis,
  ...withoutShadowedEmojis(builtInEmojis, customEmojis)
];

export {
  isTextPresentation,
  mergeEmojis,
  shouldUseFallbackImage,
  withoutShadowedEmojis,
  type TEmojiItem
};
