const getPlainTextFromHtml = (html: string): string => {
  return html.replace(/<[^>]+>/g, '').trim();
};

export { getPlainTextFromHtml };
