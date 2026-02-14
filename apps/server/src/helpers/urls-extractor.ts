import LinkifyIt from 'linkify-it';

const linkify = new LinkifyIt();

const extractUrls = (content: string): string[] => {
  try {
    const matches = linkify.match(content);

    const urls = matches ? matches.map((m) => m.url) : [];

    // remove duplicates
    return Array.from(new Set(urls));
  } catch {
    // ignore
  }

  return [];
};

export { extractUrls };
