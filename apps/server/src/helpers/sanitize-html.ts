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
    disallowedTagsMode: 'discard',
    // headings and list items contain inline content only, so replace with <p>
    // to preserve their text as a block rather than collapsing it to bare text
    // block containers (div, blockquote, section etc) may wrap <p> children, so
    // just discard the wrapper -- the inner <p> tags are already correct structure
    transformTags: {
      h1: 'p',
      h2: 'p',
      h3: 'p',
      h4: 'p',
      h5: 'p',
      h6: 'p',
      li: 'p'
    }
  });

  return input;
};

export { sanitizeMessageHtml };
