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

type TShortcodedEmoji = Pick<TEmojiItem, 'name' | 'shortcodes'>;

const getTakenShortcodes = (customEmojis: TShortcodedEmoji[]): Set<string> =>
  new Set(
    customEmojis.flatMap(({ name, shortcodes }) => [name, ...shortcodes])
  );

// a shortcode resolves to a single emoji everywhere downstream: tiptap stores only
// the name on the node and keeps the first match for it, and reactions resolve that
// same name against the custom emoji table. a built-in emoji whose shortcode a
// custom one has taken is therefore unreachable, so it is dropped from every list
// the user can pick from instead of being offered and inserting the custom emoji
const withoutShadowedEmojis = <TBuiltIn extends TShortcodedEmoji>(
  builtInEmojis: TBuiltIn[],
  customEmojis: TShortcodedEmoji[]
): TBuiltIn[] => {
  if (customEmojis.length === 0) return builtInEmojis;

  const takenShortcodes = getTakenShortcodes(customEmojis);

  return builtInEmojis.filter(
    ({ name, shortcodes }) =>
      !takenShortcodes.has(name) &&
      !shortcodes.some((shortcode) => takenShortcodes.has(shortcode))
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
