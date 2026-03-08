// inline html pattern -- matches tags we want to pass through untouched
// (mention spans, emoji images, existing <a> tags from linkify etc)
const INLINE_HTML_RE = /<(?:span|img|a)\b[^>]*>(?:[\s\S]*?<\/(?:span|a)>)?/gi;

// escapes html special chars in plain text segments only
const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// splits a string into alternating [plain, html-tag, plain, html-tag, ...]
// segments so we can escape only the plain parts
const splitOnInlineHtml = (s: string): string[] => s.split(INLINE_HTML_RE);
const matchInlineHtml = (s: string): string[] => {
  const tags: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(INLINE_HTML_RE.source, 'gi');
  while ((m = re.exec(s)) !== null) tags.push(m[0]);
  return tags;
};

// inline markdown rules applied in order -- order matters (bold before italic,
// bold+italic before bold, etc)
// each rule: [pattern, replacement]
// replacement can reference capture groups
// we apply these only to plain-text segments (not inside html tags)
type TInlineRule = [RegExp, string];

const INLINE_RULES: TInlineRule[] = [
  // bold+italic: ***text*** -- delimiters must be snug against non-whitespace
  [
    /\*\*\*(?=\S)((?:[^*]|\*(?!\*\*))*\S)\*\*\*/g,
    '<strong><em>$1</em></strong>'
  ],
  // bold: **text**
  [/\*\*(?=\S)((?:[^*]|\*(?!\*))*\S)\*\*/g, '<strong>$1</strong>'],
  // bold alt: __text__
  [/__(?=\S)((?:[^_]|_(?!_))*\S)__/g, '<strong>$1</strong>'],
  // italic: *text*
  [/(?<!\*)\*(?!\*)(?=\S)((?:[^*])*\S)\*(?!\*)/g, '<em>$1</em>'],
  // italic alt: _text_
  [/(?<!_)_(?!_)(?=\S)((?:[^_])*\S)_(?!_)/g, '<em>$1</em>'],
  // strikethrough: ~~text~~
  [/~~((?:[^~]|~(?!~))+?)~~/g, '<del>$1</del>'],
  // inline code: `code` -- content is literal, not further processed
  [/`([^`]+)`/g, '<code>$1</code>'],
  // markdown link: [text](url)
  [
    /\[([^\]]*)\]\(([^)]*)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  ],
  // hard line break: two trailing spaces before a newline
  [/ {2}\n/g, '<br>']
];

// applies inline rules to a string, skipping over inline html segments
const applyInlineRules = (s: string): string => {
  // split on inline html tokens so we don't mangle mention spans / emoji imgs
  const plains = splitOnInlineHtml(s);
  const tags = matchInlineHtml(s);

  const processedPlains = plains.map((plain) => {
    let out = escapeHtml(plain);
    for (const [pattern, replacement] of INLINE_RULES) {
      pattern.lastIndex = 0;
      out = out.replace(pattern, replacement);
    }
    return out;
  });

  return processedPlains.map((p, i) => p + (tags[i] ?? '')).join('');
};

// decodes basic html entities from tiptap's serialised paragraph content
// so block rules like blockquote (> ...) can match against plain characters
const decodeEntities = (s: string): string =>
  s
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ');

// extracts the inner content of a single tiptap <p>...</p> block
const extractParagraphContent = (pHtml: string): string =>
  decodeEntities(pHtml);

const FENCE_RE = /^(`{3,}|~{3,})/;

// converts tiptap's paragraph-wrapped html to a flat array of markdown lines,
// preserving inline html nodes (mentions, emoji) as passthrough
const tiptapHtmlToLines = (html: string): string[] => {
  const paragraphs: string[] = [];
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let match: RegExpExecArray | null;

  while ((match = pRegex.exec(html)) !== null) {
    paragraphs.push(extractParagraphContent(match[1] ?? ''));
  }

  if (paragraphs.length === 0) return [html];

  // join with \n or \n\n depending on whether we're inside a fence
  let inFence = false;
  let joined = '';

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i] ?? '';
    joined += i === 0 ? para : (inFence ? '\n' : '\n\n') + para;
    if (FENCE_RE.test(para.trimStart())) inFence = !inFence;
  }

  return joined.split('\n');
};

// converts an array of markdown lines to html
const linesToHtml = (lines: string[]): string => {
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? '';

    // fenced code block
    const fenceMatch = line.match(/^(`{3,}|~{3,})(\S*)/);
    if (fenceMatch) {
      const fence = fenceMatch[1] ?? '```';
      i++;
      const codeLines: string[] = [];
      while (i < lines.length && !(lines[i] ?? '').startsWith(fence)) {
        codeLines.push(escapeHtml(lines[i] ?? ''));
        i++;
      }
      i++; // consume closing fence
      out.push(`<pre><code>${codeLines.join('\n')}\n</code></pre>`);
      continue;
    }

    // atx heading
    const headingMatch = line.match(/^(#{1,6}) (.*)/);
    if (headingMatch) {
      const level = headingMatch[1]!.length;
      const content = applyInlineRules(headingMatch[2] ?? '');
      out.push(`<h${level}>${content}</h${level}>`);
      i++;
      continue;
    }

    // blockquote: collect consecutive > lines, skipping blank lines between
    // them as long as the next non-blank line is also a > line
    if (line.startsWith('> ') || line === '>') {
      const bqLines: string[] = [];
      while (i < lines.length) {
        const cur = lines[i] ?? '';
        if (cur.startsWith('> ') || cur === '>') {
          bqLines.push(cur.replace(/^> ?/, ''));
          i++;
        } else if (cur.trim() === '') {
          // peek ahead: if next non-blank line is also a > line, include the
          // blank as a paragraph break inside the blockquote
          let j = i + 1;
          while (j < lines.length && (lines[j] ?? '').trim() === '') j++;
          const next = lines[j] ?? '';
          if (next.startsWith('> ') || next === '>') {
            bqLines.push('');
            i++;
          } else {
            break;
          }
        } else {
          break;
        }
      }
      // recurse to handle nested markdown inside the blockquote
      const inner = linesToHtml(bqLines);
      out.push(`<blockquote>${inner}</blockquote>`);
      continue;
    }

    // unordered list: collect consecutive - / * / + lines
    if (/^[-*+] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+] /.test(lines[i]!)) {
        items.push(applyInlineRules(lines[i]!.replace(/^[-*+] /, '')));
        i++;
      }
      out.push(`<ul>${items.map((t) => `<li>${t}</li>`).join('')}</ul>`);
      continue;
    }

    // ordered list: collect consecutive N. lines
    if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i]!)) {
        items.push(applyInlineRules(lines[i]!.replace(/^\d+\. /, '')));
        i++;
      }
      out.push(`<ol>${items.map((t) => `<li>${t}</li>`).join('')}</ol>`);
      continue;
    }

    // blank line -- paragraph boundary, skip
    if (line.trim() === '') {
      i++;
      continue;
    }

    // paragraph: collect consecutive non-blank, non-block lines
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i]!.trim() !== '' &&
      !FENCE_RE.test(lines[i]!) &&
      !/^#{1,6} /.test(lines[i]!) &&
      !/^[-*+] /.test(lines[i]!) &&
      !/^\d+\. /.test(lines[i]!) &&
      !(lines[i]!.startsWith('> ') || lines[i] === '>')
    ) {
      paraLines.push(lines[i]!);
      i++;
    }
    if (paraLines.length > 0) {
      // join with <br> for hard line breaks within a paragraph
      const content = applyInlineRules(paraLines.join('  \n'));
      out.push(`<p>${content}</p>`);
    }
  }

  return out.join('\n') + (out.length > 0 ? '\n' : '');
};

// converts tiptap editor html to stored html via markdown rendering
// inline html nodes (mentions, emoji) are passed through unchanged
const markdownToHtml = (tiptapHtml: string): string => {
  if (!tiptapHtml) return '';
  const lines = tiptapHtmlToLines(tiptapHtml);
  return linesToHtml(lines);
};

// kept for use by tests / other callers that need the intermediate markdown
const tiptapHtmlToMarkdown = (html: string): string =>
  tiptapHtmlToLines(html).join('\n');

export { markdownToHtml, tiptapHtmlToMarkdown };
