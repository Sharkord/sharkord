import LinkifyIt from 'linkify-it';

const linkify = new LinkifyIt();

const isExplicitHttpUrl = (value: string): boolean =>
  /^https?:\/\/\S+$/i.test(value);

const normalizeAnchorHref = (anchorHtml: string): string => {
  const hrefMatch = anchorHtml.match(/\bhref=(['"])(.*?)\1/i);
  const contentMatch = anchorHtml.match(/^<a\b[^>]*>([\s\S]*?)<\/a>$/i);

  if (!hrefMatch || !contentMatch) {
    return anchorHtml;
  }

  const href = hrefMatch[2];
  const innerText = contentMatch[1]?.trim();

  if (!href) {
    return anchorHtml;
  }

  if (
    !innerText ||
    /<[^>]+>/.test(innerText) ||
    !isExplicitHttpUrl(innerText)
  ) {
    return anchorHtml;
  }

  if (href === innerText) {
    return anchorHtml;
  }

  return anchorHtml.replace(/\bhref=(['"])(.*?)\1/i, `href="${innerText}"`);
};

// processes an HTML string and wraps explicit http/https URLs in <a> tags
const linkifyHtml = (html: string): string => {
  const parts = html.split(/(<a\b[^>]*>[\s\S]*?<\/a>|<[^>]+>)/gi);

  return parts
    .map((part) => {
      if (/^<a\b/i.test(part)) {
        return normalizeAnchorHref(part);
      }

      if (/^</.test(part)) {
        return part;
      }

      const matches = linkify.match(part);

      if (!matches || matches.length === 0) {
        return part;
      }

      // only keep matches with an explicit protocol (http or https)
      const validMatches = matches.filter(
        (m) => m.schema === 'https:' || m.schema === 'http:'
      );

      if (validMatches.length === 0) {
        return part;
      }

      let result = '';
      let lastIndex = 0;

      for (const match of validMatches) {
        result += part.slice(lastIndex, match.index);
        result += `<a href="${match.url}" target="_blank" rel="noopener noreferrer">${match.raw}</a>`;
        lastIndex = match.lastIndex;
      }

      result += part.slice(lastIndex);

      return result;
    })
    .join('');
};

export { linkifyHtml };
