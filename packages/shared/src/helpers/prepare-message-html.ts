import { linkifyHtml } from './linkify-html';

// block tags that can wrap a trailing hard-break before another block begins
const BLOCK_TAG = '(?:p|h[1-6]|blockquote|li|div|pre)';

// a trailing hard-break before a closing block tag is invisible in static html
// rendering -- convert it to an empty <p></p> so the line break is preserved
const normalizeLineBreaks = (html: string): string =>
  html.replace(
    new RegExp(
      `<br\\s[^>]*class="hard-break"[^>]*>\\s*</(${BLOCK_TAG})>(\\s*<${BLOCK_TAG})`,
      'g'
    ),
    '</$1><p></p>$2'
  );

// applies all pre-send transformations to outgoing message html in the correct order
const prepareMessageHtml = (html: string): string =>
  linkifyHtml(normalizeLineBreaks(html));

export { normalizeLineBreaks, prepareMessageHtml };
