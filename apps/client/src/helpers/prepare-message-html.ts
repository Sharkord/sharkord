import { marked, Renderer } from 'marked';
import { linkifyHtml } from '@sharkord/shared';

const customRenderer = new Renderer();
// don't escape html inside code spans
customRenderer.codespan = ({ text }: { text: string }) =>
  `<code>${text}</code>`;

// convert tiptap html to markdown for rendering.
// tiptap wraps content in <p> tags, escaping user-typed < as &lt; etc.
// we keep those entities as-is -- marked passes them through correctly.
const tiptapHtmlToMarkdown = (html: string): string =>
  html
    .replace(/<p>([\s\S]*?)<\/p>/g, (_, content) => content + '\n\n')
    .replace(/<br\s*\/?>/g, '\n')
    // collapse \n\n between consecutive list item lines so marked treats them
    // as a tight list rather than a loose one
    .replace(/(^[ \t]*(?:-|\d+\.)\s[^\n]*)\n\n(?=[ \t]*(?:-|\d+\.)\s)/gm, '$1\n')
    .trim();

const normaliseFences = (md: string): string =>
  md.replace(/^(`{3,}|~{3,})[^\n]*\n([\s\S]*?)^\1\s*$/gm, (_, fence, body) => {
    const fixed = body
      .replace(/^(\u00a0|&nbsp;)+$/gm, '')
      .replace(/\n\n/g, '\n')
      .replace(/^\n/, '')
      .replace(/\n$/, '');
    return `${fence}\n${fixed}\n${fence}`;
  });

const prepareMessageHtml = (html: string): string => {
  if (!html) return '';
  const markdown = normaliseFences(tiptapHtmlToMarkdown(html));
  const rendered = marked.parse(markdown, {
    gfm: true,
    renderer: customRenderer
  }) as string;
  return linkifyHtml(rendered.trim());
};

export { prepareMessageHtml };
