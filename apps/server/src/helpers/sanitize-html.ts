import { stripZalgo } from '@sharkord/shared';
import sanitize from 'sanitize-html';

const sanitizeMessageHtml = (html: string): string => {
  let input = html;

  // first strip zalgo to prevent it from being used to bypass sanitization
  input = stripZalgo(input);

  // then sanitize the HTML content
  input = sanitize(input, {
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
      's',
      'i',
      'u',
      'hr',
      'blockquote',
      'li',
      'ul',
      'ol',
      // links
      'a',
      // emoji (span wrapper + img fallback)
      'span',
      'img'
    ],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      span: ['data-type', 'data-name', 'class'],
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

  return input;
};

export { sanitizeMessageHtml };
