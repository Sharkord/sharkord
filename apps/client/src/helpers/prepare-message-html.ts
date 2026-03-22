import { markdownToHtml } from './tiptap-markdown';

const isListItem = (s: string): boolean => /^([*-]|\d+\.) /.test(s);
const isFence = (s: string): boolean => /^```/.test(s);

const distillMarkdownFromHtml = (html: string): string => {
  const paragraphs: string[] = [];
  const re = /<p>([\s\S]*?)<\/p>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const raw = (m[1] ?? '')
      .replace(/<br\s*\/?>/g, '\n')
      .replace(/(?:&nbsp;|\u00a0)/g, ' ')
      .replace(/(^|\n)&gt; /g, '$1> ');
    paragraphs.push(raw);
  }

  let markdown = '';
  let insideFence = false;
  for (let i = 0; i < paragraphs.length; i++) {
    const cur = paragraphs[i]!;
    const prev = paragraphs[i - 1];
    if (i === 0) {
      markdown += cur;
    } else {
      const sep =
        insideFence || (isListItem(cur) && isListItem(prev!)) ? '\n' : '\n\n';
      markdown += sep + cur;
    }
    if (isFence(cur)) insideFence = !insideFence;
  }

  return markdown.trim();
};

const prepareMessageHtml = (html: string): string =>
  markdownToHtml(distillMarkdownFromHtml(html));

export { prepareMessageHtml };
