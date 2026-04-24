import { MentionNode } from '@/components/tiptap-input/extensions/mentions/node';
import { generateHTML, generateJSON, type JSONContent } from '@tiptap/core';
import { MarkdownManager } from '@tiptap/markdown';
import StarterKit from '@tiptap/starter-kit';

const EXTENSIONS = [StarterKit, MentionNode];

let _manager: MarkdownManager | null = null;

const getManager = (): MarkdownManager => {
  if (!_manager) {
    _manager = new MarkdownManager({ extensions: EXTENSIONS });
  }
  return _manager;
};

const decodeTextNodes = (node: JSONContent): JSONContent => {
  if (node.text !== undefined) {
    return {
      ...node,
      text: node.text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
    };
  }
  if (node.content) {
    return { ...node, content: node.content.map(decodeTextNodes) };
  }
  return node;
};

const markdownToHtml = (markdown: string): string => {
  const json = getManager().parse(markdown);
  const decoded = decodeTextNodes(json);
  return generateHTML(decoded, EXTENSIONS);
};

// prosemirror's dom parser normalises whitespace in inline content, stripping
// bare \n inside <pre> blocks -- replace them with <br> first so they survive
const preservePreNewlines = (html: string): string =>
  html.replace(/<pre[\s\S]*?<\/pre>/gi, (match) =>
    match.replace(/\n/g, '<br>')
  );

const htmlToMarkdown = (html: string): string => {
  const json = generateJSON(preservePreNewlines(html), EXTENSIONS);
  const encoded = encodeHtmlEntitiesInJson(json);
  return getManager().serialize(encoded);
};

const encodeHtmlEntitiesInJson = (node: JSONContent): JSONContent => {
  if (node.type === 'text' && typeof node.text === 'string') {
    const linkMark = node.marks?.find((m) => m.type === 'link');
    if (linkMark) {
      const href = linkMark.attrs?.href as string;
      if (href && href === node.text) {
        return {
          ...node,
          text: node.text.replace(/</g, '&lt;').replace(/>/g, '&gt;'),
          marks: node.marks?.filter((m) => m.type !== 'link')
        };
      }
    }
    return {
      ...node,
      text: node.text.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    };
  }
  if (node.content) {
    return { ...node, content: node.content.map(encodeHtmlEntitiesInJson) };
  }
  return node;
};

const markdownToEditorHtml = (markdown: string): string =>
  markdown
    .split('\n\n')
    .map((block) =>
      block
        .split('\n')
        .map((line) => {
          const leadingSpaces = line.match(/^ +/)?.[0] ?? '';
          const nbspSpaces = leadingSpaces.replace(/ /g, '\u00a0');
          return `<p>${nbspSpaces}${line.slice(leadingSpaces.length) || '<br>'}</p>`;
        })
        .join('')
    )
    .join('');

const htmlToEditorHtml = (html: string): string => {
  if (!html) return '';
  const markdown = htmlToMarkdown(html);
  return markdownToEditorHtml(markdown);
};

export { htmlToEditorHtml, htmlToMarkdown, markdownToHtml };
