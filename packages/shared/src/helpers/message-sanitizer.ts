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

const removeCommandElements = (html: string): string =>
  html.replace(/<command\b[^>]*>.*?<\/command>/gi, '');

const removeEmojiElements = (html: string): string =>
  html
    .replace(/<span[^>]*data-type="emoji"[^>]*>.*?<\/span>/gi, '')
    .replace(/<img[^>]*class="emoji-image"[^>]*\/?>/gi, '');

const removeChannelReferenceElements = (html: string): string =>
  html.replace(
    /<span[^>]*data-type="channel-reference"[^>]*>.*?<\/span>/gi,
    ''
  );

const hasMediaTag = (html: string): boolean =>
  /<(img|video|audio|iframe)\b/i.test(html);

const hasEmojiElement = (html: string): boolean =>
  /<span[^>]*data-type="emoji"[^>]*>/.test(html) ||
  /<img[^>]*class="emoji-image"[^>]*>/.test(html);

const hasChannelReferenceElement = (html: string): boolean =>
  /<span[^>]*data-type="channel-reference"[^>]*>/i.test(html);

const isEmptyMessage = (content: string | undefined | null): boolean => {
  if (!content) return true;

  const cleaned = removeProseMirrorArtifacts(content);
  const hasMedia = hasMediaTag(cleaned);
  const hasText = stripToText(cleaned).length > 0;
  const hasChannelReference = hasChannelReferenceElement(cleaned);

  return !hasText && !hasMedia && !hasChannelReference;
};

const isEmojiOnlyMessage = (content: string | undefined | null): boolean => {
  if (!content) return false;

  if (!hasEmojiElement(content)) return false;

  if (hasChannelReferenceElement(content)) return false;

  return stripToText(content, [removeEmojiElements]).length === 0;
};

const getPlainTextFromHtml = (html: string): string => {
  return stripToText(html, [
    removeProseMirrorArtifacts,
    removeEmojiElements,
    removeCommandElements,
    removeChannelReferenceElements
  ]);
};

export {
  getPlainTextFromHtml,
  isEmojiOnlyMessage,
  isEmptyMessage,
  removeChannelReferenceElements,
  removeCommandElements,
  removeEmojiElements
};
