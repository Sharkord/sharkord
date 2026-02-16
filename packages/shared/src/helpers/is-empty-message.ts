const isEmptyMessage = (content: string | undefined | null): boolean => {
  if (!content) return true;

  // check if it has media (eg: emojis will be detected here)
  const hasMedia = /<(img|video|audio|iframe)\b/i.test(content);

  const cleaned = content
    // remove PM separators
    .replace(/<img[^>]*ProseMirror-separator[^>]*>/gi, "")
    .replace(/<br[^>]*ProseMirror-trailingBreak[^>]*>/gi, "")
    // remove all remaining tags
    .replace(/<[^>]*>/g, "")
    // normalize spaces
    .replace(/&nbsp;/gi, " ")
    .replace(/\u00A0/g, " ")
    .trim();

  const hasText = cleaned.length > 0;

  return !hasText && !hasMedia;
};

export { isEmptyMessage };
