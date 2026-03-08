// converts stored message html back to tiptap-compatible paragraph html for
// editing, using the browser's native DOM TreeWalker -- no dependencies needed
//
// the output is a series of <p>...</p> nodes (one per line) that tiptap
// will display as raw markdown text, preserving all characters the user typed

// block-level tags -- used to detect if an unknown wrapper element contains
// block content that should be recursed into rather than flattened as inline text
const BLOCK_TAGS = new Set([
  'P',
  'DIV',
  'SECTION',
  'ARTICLE',
  'MAIN',
  'HEADER',
  'FOOTER',
  'ASIDE',
  'UL',
  'OL',
  'LI',
  'PRE',
  'BLOCKQUOTE',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'TABLE',
  'TR',
  'TD',
  'TH',
  'TBODY',
  'THEAD',
  'TFOOT',
  'FIGURE',
  'FIGCAPTION',
  'DETAILS',
  'SUMMARY',
  'HR'
]);

// inline nodes we convert to markdown syntax in-place
const INLINE_OPEN: Partial<Record<string, string>> = {
  STRONG: '**',
  EM: '*',
  DEL: '~~',
  CODE: '`'
};

const INLINE_CLOSE = INLINE_OPEN;

// walk an element's children and produce a markdown string for that line
const serializeInline = (node: Node): string => {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? '';
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return '';

  const el = node as Element;
  const tag = el.tagName;

  // mention span -- preserve as raw html
  if (tag === 'SPAN' && el.getAttribute('data-type') === 'mention') {
    return el.outerHTML;
  }

  // emoji image -- preserve as raw html
  if (tag === 'IMG') {
    return el.outerHTML;
  }

  // link
  if (tag === 'A') {
    const href = el.getAttribute('href') ?? '';
    const inner = serializeChildren(el);
    // if the link text and href are the same it's a bare auto-link, just emit the url
    if (inner === href) return href;
    return `[${inner}](${href})`;
  }

  // inline code -- use backtick, don't recurse (content is literal)
  if (tag === 'CODE') {
    return `\`${el.textContent ?? ''}\``;
  }

  const open = INLINE_OPEN[tag];
  if (open) {
    return `${open}${serializeChildren(el)}${INLINE_CLOSE[tag]}`;
  }

  // br inside a paragraph = hard line break (shift+enter)
  if (tag === 'BR') return '  \n';

  // anything else: just recurse into children
  return serializeChildren(el);
};

const serializeChildren = (el: Element): string =>
  Array.from(el.childNodes).map(serializeInline).join('');

// each block element produces one or more output lines (strings without \n)
const serializeBlock = (el: Element, lines: string[]): void => {
  const tag = el.tagName;

  if (tag === 'P') {
    // a <p> with no content is a blank line
    const content = serializeChildren(el);
    lines.push(content);
    return;
  }

  if (/^H[1-6]$/.test(tag)) {
    const level = parseInt(tag[1] ?? '1', 10);
    lines.push(`${'#'.repeat(level)} ${serializeChildren(el)}`);
    return;
  }

  if (tag === 'BLOCKQUOTE') {
    // each child block inside the blockquote gets prefixed with >
    const inner: string[] = [];
    Array.from(el.children).forEach((child) =>
      serializeBlock(child as Element, inner)
    );
    inner.forEach((line) => lines.push(`> ${line}`));
    return;
  }

  if (tag === 'UL' || tag === 'OL') {
    Array.from(el.children).forEach((child, i) => {
      if (child.tagName !== 'LI') return;
      const bullet = tag === 'OL' ? `${i + 1}.` : '-';
      lines.push(`${bullet} ${serializeChildren(child as Element)}`);
    });
    return;
  }

  if (tag === 'PRE') {
    const codeEl = el.querySelector('code');
    const content = codeEl
      ? (codeEl.textContent ?? '')
      : (el.textContent ?? '');
    // emit opening fence, each code line, closing fence
    lines.push('```');
    content
      .replace(/^\n/, '')
      .replace(/\n$/, '')
      .split('\n')
      .forEach((line) => lines.push(line));
    lines.push('```');
    return;
  }

  // if the element contains block-level children, recurse into them
  const hasBlockChild = Array.from(el.children).some((c) =>
    BLOCK_TAGS.has(c.tagName)
  );
  if (hasBlockChild) {
    Array.from(el.childNodes).forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = (child.textContent ?? '').trim();
        if (text) lines.push(text);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        serializeBlock(child as Element, lines);
      }
    });
    return;
  }

  // purely inline wrapper -- treat as a single paragraph line
  lines.push(serializeChildren(el));
};

const htmlToTiptapHtml = (html: string): string => {
  if (!html) return '';

  const container = document.createElement('div');
  container.innerHTML = html;

  const lines: string[] = [];

  Array.from(container.childNodes).forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) lines.push(text);
      return;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      serializeBlock(node as Element, lines);
    }
  });

  // wrap each line as a tiptap paragraph
  // leading spaces are encoded as &nbsp; so ProseMirror's DOMParser doesn't
  // collapse them -- decodeEntities in markdown-to-html converts them back
  const FENCE_RE = /^(`{3,}|~{3,})/;
  const filtered = lines.filter(
    (line, i) =>
      !(
        line === '' &&
        i + 1 < lines.length &&
        FENCE_RE.test(lines[i + 1] ?? '')
      )
  );

  return filtered
    .map(
      (line) =>
        `<p>${line.replace(/^[ \t]+/, (m) =>
          [...m]
            .map((c) => (c === '\t' ? '&nbsp;&nbsp;&nbsp;&nbsp;' : '&nbsp;'))
            .join('')
        )}</p>`
    )
    .join('');
};

export { htmlToTiptapHtml };
