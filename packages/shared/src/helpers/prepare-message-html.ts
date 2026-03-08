import { linkifyHtml } from './linkify-html';
import { markdownToHtml } from './markdown-to-html';

// apply all pre-send transformations to outgoing message html in order:
// first convert tiptap paragraph html => markdown => rendered html
// then linkify any bare urls that weren't already markdown links
const prepareMessageHtml = (html: string): string =>
  linkifyHtml(markdownToHtml(html));

export { prepareMessageHtml };
