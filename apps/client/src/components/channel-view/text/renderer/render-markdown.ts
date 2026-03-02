import { linkifyHtml } from '@sharkord/shared';
import { marked } from 'marked';

marked.setOptions({
  breaks: true,
  gfm: true
});

/**
 * Converts stored message content to rendered HTML for display.
 *
 * The editor stores plain text wrapped in <p> tags with literal markdown
 * syntax (e.g. `<p># heading</p><p>**bold**</p>`).
 *
 * This function strips the editor HTML wrapper, runs the text through
 * a proper markdown parser, then linkifies any remaining bare URLs.
 *
 * Old messages stored as proper HTML (with <h1>, <strong>, etc.) pass
 * through safely — marked preserves existing HTML tags.
 */
const renderMarkdown = (content: string): string => {
  // Convert editor HTML to markdown-like text:
  // - <br> variants → newlines
  // - paragraph boundaries → double newlines
  // - strip remaining <p> tags
  const text = content
    .replace(/<br\s*(?:class="[^"]*")?\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p>/gi, '\n\n')
    .replace(/<\/?p>/gi, '');

  // Convert markdown → HTML (preserves inline HTML like mentions, emojis)
  const html = marked.parse(text) as string;

  // Catch any bare URLs that marked didn't auto-link
  return linkifyHtml(html);
};

export { renderMarkdown };
