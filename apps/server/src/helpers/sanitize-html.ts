import sanitize from 'sanitize-html';

const sanitizeMessageHtml = (html: string): string => {
  return sanitize(html, {
    // this might need some tweaking in the future
    allowedTags: [
      // basic text structure
      'p',
      'br',
      // inline formatting
      'strong',
      'em',
      'code',
      'pre',
      // links
      'a',
      // emoji (span wrapper + img fallback)
      'span',
      'img'
    ],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      span: ['data-type', 'data-name', 'data-user-id', 'class'],
      img: ['src', 'alt', 'draggable', 'loading', 'align', 'class'],
      code: ['class'],
      pre: ['class'],
      br: ['class'],
      '*': []
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    // disallow any script or event handler attributes globally
    disallowedTagsMode: 'discard'
  });
};

export { sanitizeMessageHtml };
