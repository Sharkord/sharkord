import { stripZalgo } from '@sharkord/shared';
import sanitize from 'sanitize-html';

const sanitizeMessageHtml = (html: string): string => {
  let input = html;

  // first strip zalgo to prevent it from being used to bypass sanitization
  input = stripZalgo(input);

  // then sanitize the HTML content
  input = sanitize(input, {
    allowedTags: [
      // basic text structure
      'p',
      'br',
      'h1',
      'h2',
      'ul',
      'ol',
      'li',
      'blockquote',
      'strong',
      'em',
      'del',
      'code',
      'pre',
      'a',
      'span', // emoji wrapper
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
    disallowedTagsMode: 'discard',
    transformTags: {
      h3: 'h2',
      h4: 'h2',
      h5: 'h2',
      h6: 'h2'
    }
  });

  return input;
};

export { sanitizeMessageHtml };
