const isEmptyMessage = (content: string): boolean => {

  if (!content) return true;

  const text = content
    .replace(/<p\b[^>]*>(?:\s|&nbsp;|<br\b[^>]*>)*<\/p>/gi, '')
    .replace(/&nbsp;/g, ' ')
    .trim();

  return text.length === 0;
}

export { isEmptyMessage };