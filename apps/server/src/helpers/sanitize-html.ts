import { stripZalgo } from '@sharkord/shared';
import sanitize from 'sanitize-html';

// the only images a message legitimately carries are emoji: custom ones served
// from this server's /public path, and the github set, whose fallback images
// come from jsdelivr
const ALLOWED_IMAGE_HOSTS = ['cdn.jsdelivr.net'];

const isAllowedImageSrc = (src?: string): boolean => {
  if (!src) return false;

  // relative, so same origin by construction
  if (src.startsWith('/public/')) return true;

  try {
    const url = new URL(src);

    if (ALLOWED_IMAGE_HOSTS.includes(url.hostname)) return true;

    // the client builds custom emoji urls absolutely, against whatever host the
    // deployment answers on, and the server cannot know that host. Matching the
    // path narrows this to something shaped like our own uploads, it does not
    // prove the origin: see 7.4 in AUDIT.md
    return url.pathname.startsWith('/public/');
  } catch {
    return false;
  }
};

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
      span: [
        'data-type',
        'data-name',
        'data-user-id',
        'data-channel-id',
        'class'
      ],
      img: ['src', 'alt', 'draggable', 'loading', 'align', 'class'],
      br: ['class'],
      '*': []
    },
    allowedClasses: {
      span: [
        'mention',
        'channel-reference',
        'plugin-command',
        'emoji-image',
        'hard-break'
      ],
      img: ['emoji-image'],
      br: ['hard-break']
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
      li: 'p',
      // an anchor opened in a new tab hands the destination window.opener
      a: (tagName, attribs) => ({
        tagName,
        attribs: attribs.target
          ? { ...attribs, rel: 'noopener noreferrer' }
          : attribs
      }),
      // an arbitrary remote src makes every member of the channel fetch a URL
      // the sender chose, which is an IP harvester and a read receipt
      img: (tagName, attribs) => {
        if (isAllowedImageSrc(attribs.src)) return { tagName, attribs };

        const allowedAttribs = { ...attribs };

        delete allowedAttribs.src;

        return { tagName, attribs: allowedAttribs };
      }
    }
  });

  return input;
};

export { sanitizeMessageHtml };
