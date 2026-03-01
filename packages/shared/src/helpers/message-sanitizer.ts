const stripToText = (
  html: string,
  preProcess?: ((html: string) => string)[]
): string => {
  let result = html;

  if (preProcess) {
    for (const fn of preProcess) {
      result = fn(result);
    }
  }

  return result
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\u00A0/g, ' ')
    .trim();
};

const removeProseMirrorArtifacts = (html: string): string =>
  html
    .replace(/<img[^>]*ProseMirror-separator[^>]*>/gi, '')
    .replace(/<br[^>]*ProseMirror-trailingBreak[^>]*>/gi, '');

const removeEmojiElements = (html: string): string =>
  html
    .replace(/<span[^>]*data-type="emoji"[^>]*>.*?<\/span>/gi, '')
    .replace(/<img[^>]*class="emoji-image"[^>]*\/?>/gi, '');

const hasMediaTag = (html: string): boolean =>
  /<(img|video|audio|iframe)\b/i.test(html);

const hasEmojiElement = (html: string): boolean =>
  /<span[^>]*data-type="emoji"[^>]*>/.test(html) ||
  /<img[^>]*class="emoji-image"[^>]*>/.test(html);

const isEmptyMessage = (content: string | undefined | null): boolean => {
  if (!content) return true;

  const cleaned = removeProseMirrorArtifacts(content);
  const hasMedia = hasMediaTag(cleaned);
  const hasText = stripToText(cleaned).length > 0;

  return !hasText && !hasMedia;
};

const isEmojiOnlyMessage = (content: string | undefined | null): boolean => {
  if (!content) return false;

  if (!hasEmojiElement(content)) return false;

  return stripToText(content, [removeEmojiElements]).length === 0;
};

const getPlainTextFromHtml = (html: string): string => {
  return stripToText(html, [removeProseMirrorArtifacts, removeEmojiElements]);
};

export { getPlainTextFromHtml, isEmojiOnlyMessage, isEmptyMessage };
