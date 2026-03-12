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
      // block structure
      'p',
      'br',
      // headings (from markdown rendering)
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      // lists (from markdown rendering)
      'ul',
      'ol',
      'li',
      // blockquote (from markdown rendering)
      'blockquote',
      // inline formatting
      'strong',
      'em',
      'code',
      'pre',
      'del',
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
    disallowedTagsMode: 'discard'
  });

  return input;
};

export { sanitizeMessageHtml };
