// converts stored rendered html back to tiptap editor html for editing.
// stored messages are rendered html (e.g. <h1>heading</h1>) but the editor
// expects plain-text paragraphs with markdown syntax as literal text.
// we parse the dom and reconstruct markdown, then wrap in paragraphs.

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const nodeToMarkdown = (node: Node): string => {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? '';
    // skip pure-whitespace text nodes (e.g. newlines between block elements)
    if (!text.trim()) return '';
    // collapse internal newlines/extra whitespace to a single space
    return escapeHtml(text.replace(/\s*\n\s*/g, ' '));
  }

  if (!(node instanceof Element)) return '';

  const tag = node.tagName.toLowerCase();
  const inner = Array.from(node.childNodes).map(nodeToMarkdown).join('');

  switch (tag) {
    case 'strong':
    case 'b':
      return `**${inner}**`;
    case 'em':
    case 'i':
      return `*${inner}*`;
    case 'del':
    case 's':
      return `~~${inner}~~`;
    case 'code':
      return `\`${inner}\``;
    case 'a':
      return inner; // already linkified -- just use text
    case 'li':
      return `- ${inner}`;
    case 'p':
      return inner;
    // our emoji/mention spans -- pass through as-is
    case 'span':
      return node.outerHTML;
    default:
      return inner;
  }
};

const blockToEditorParagraph = (el: Element): string => {
  const tag = el.tagName.toLowerCase();
  const inner = Array.from(el.childNodes).map(nodeToMarkdown).join('');

  switch (tag) {
    case 'h1':
      return `<p># ${inner}</p>`;
    case 'h2':
      return `<p>## ${inner}</p>`;
    case 'h3':
      return `<p>### ${inner}</p>`;
    case 'h4':
      return `<p>#### ${inner}</p>`;
    case 'h5':
      return `<p>##### ${inner}</p>`;
    case 'h6':
      return `<p>###### ${inner}</p>`;
    case 'blockquote':
      return Array.from(el.children)
        .map(
          (c) =>
            `<p>&gt; ${Array.from(c.childNodes).map(nodeToMarkdown).join('')}</p>`
        )
        .join('');
    case 'ul':
      return Array.from(el.children)
        .map(
          (li) =>
            `<p>- ${Array.from(li.childNodes).map(nodeToMarkdown).join('')}</p>`
        )
        .join('');
    case 'ol':
      return Array.from(el.children)
        .map(
          (li, i) =>
            `<p>${i + 1}. ${Array.from(li.childNodes).map(nodeToMarkdown).join('')}</p>`
        )
        .join('');
    case 'pre': {
      const code = el.querySelector('code');
      const lang = code?.className.replace('language-', '') ?? '';
      const content = code?.textContent ?? '';
      return [
        `<p>\`\`\`${lang}</p>`,
        ...content.split('\n').map((l) => `<p>${l || '<br>'}</p>`),
        '<p>```</p>'
      ].join('');
    }
    case 'p':
      return `<p>${inner || '<br>'}</p>`;
    case 'li':
      return `<p>- ${inner}</p>`;
    default:
      return inner ? `<p>${inner}</p>` : '';
  }
};

const htmlToEditorHtml = (html: string): string => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const blocks = Array.from(doc.body.children);

  // if there are no block elements, treat the whole text content as a paragraph
  if (blocks.length === 0) {
    const text = escapeHtml(doc.body.textContent ?? '');
    return text ? `<p>${text}</p>` : '';
  }

  return blocks.map(blockToEditorParagraph).join('');
};

export { htmlToEditorHtml };
