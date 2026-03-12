// builds ProseMirror decorations to dim markdown syntax characters using
// marked's lexer rather than hand-rolled regexes -- the lexer gives us the
// exact token structure so we can derive syntax ranges from raw vs text
import { Extension } from '@tiptap/core';
import type { Node } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { marked, type Token } from 'marked';

const markdownSyntaxDimKey = new PluginKey<DecorationSet>('markdownSyntaxDim');

// a dim range is a [start, end) pair relative to the start of the paragraph text
type Range = [number, number];

// walk a token tree and collect syntax character ranges
// offset tracks where in the paragraph text this token starts
const collectRanges = (token: Token, offset: number, ranges: Range[]): void => {
  const raw = 'raw' in token ? token.raw : '';
  if (!raw) return;

  switch (token.type) {
    case 'heading': {
      // dim the leading `## ` prefix (depth + 1 for the space)
      const prefixLen = token.depth + 1;
      ranges.push([offset, offset + prefixLen]);
      // recurse into inline children starting after the prefix
      let childOffset = offset + prefixLen;
      for (const child of token.tokens ?? []) {
        collectRanges(child, childOffset, ranges);
        childOffset += 'raw' in child ? child.raw.length : 0;
      }
      break;
    }

    case 'blockquote': {
      // each line of the raw text starts with `> ` -- dim those prefixes
      let lineOffset = offset;
      for (const line of raw.split('\n')) {
        const m = line.match(/^(> ?)/);
        if (m) ranges.push([lineOffset, lineOffset + m[1].length]);
        lineOffset += line.length + 1; // +1 for the \n
      }
      // recurse into block children
      let childOffset = offset;
      const blockquoteToken = token as Token & { tokens?: Token[] };
      for (const child of blockquoteToken.tokens ?? []) {
        collectRanges(child, childOffset, ranges);
        childOffset += 'raw' in child ? child.raw.length : 0;
      }
      break;
    }

    case 'list': {
      let childOffset = offset;
      for (const item of token.items) {
        collectRanges(item, childOffset, ranges);
        childOffset += item.raw.length;
      }
      break;
    }

    case 'list_item': {
      // dim the leading bullet/number e.g. `- ` or `1. `
      const bulletMatch = raw.match(/^(\s*(?:[-*+]|\d+\.)\s)/);
      if (bulletMatch) ranges.push([offset, offset + bulletMatch[1].length]);
      let childOffset = offset + (bulletMatch?.[1].length ?? 0);
      for (const child of token.tokens ?? []) {
        collectRanges(child, childOffset, ranges);
        childOffset += 'raw' in child ? child.raw.length : 0;
      }
      break;
    }

    case 'paragraph':
    case 'text': {
      let childOffset = offset;
      for (const child of token.tokens ?? []) {
        collectRanges(child, childOffset, ranges);
        childOffset += 'raw' in child ? child.raw.length : 0;
      }
      break;
    }

    case 'strong':
    case 'em':
    case 'del': {
      // delimiter length = (raw.length - inner text raw length) / 2
      // find where the inner content starts in raw
      const innerRaw =
        token.tokens?.map((t) => ('raw' in t ? t.raw : '')).join('') ??
        token.text;
      const innerStart = raw.indexOf(innerRaw);
      if (innerStart > 0) {
        ranges.push([offset, offset + innerStart]);
        ranges.push([
          offset + innerStart + innerRaw.length,
          offset + raw.length
        ]);
      }
      let childOffset = offset + innerStart;
      for (const child of token.tokens ?? []) {
        collectRanges(child, childOffset, ranges);
        childOffset += 'raw' in child ? child.raw.length : 0;
      }
      break;
    }

    case 'codespan': {
      // raw = "`code`" or "``code``" -- find backtick run length
      const backticks = raw.match(/^(`+)/)?.[1].length ?? 1;
      ranges.push([offset, offset + backticks]);
      ranges.push([offset + raw.length - backticks, offset + raw.length]);
      break;
    }

    case 'link': {
      // raw = "[text](href)" or "[text][ref]"
      // dim: `[`, `](href)` tail, or `][ref]` tail
      ranges.push([offset, offset + 1]); // opening [
      const textEnd =
        offset +
        1 +
        (token.tokens?.map((t) => ('raw' in t ? t.raw : '')).join('').length ??
          token.text.length);
      ranges.push([textEnd, offset + raw.length]); // `](url)` or `][ref]`
      let childOffset = offset + 1;
      for (const child of token.tokens ?? []) {
        collectRanges(child, childOffset, ranges);
        childOffset += 'raw' in child ? child.raw.length : 0;
      }
      break;
    }

    default:
      break;
  }
};

const buildDecorations = (doc: Node): DecorationSet => {
  const decorations: Decoration[] = [];

  doc.descendants((node, pos) => {
    if (!node.isTextblock) return;

    // get the full text of this paragraph/block
    const text = node.textContent;
    if (!text) return;

    // lex the paragraph text as markdown
    const tokens = marked.lexer(text, { gfm: true });
    const ranges: Range[] = [];

    let offset = 0;
    for (const token of tokens) {
      collectRanges(token, offset, ranges);
      offset += 'raw' in token ? token.raw.length : 0;
    }

    // pos+1 to skip past the paragraph node's opening token
    const base = pos + 1;
    for (const [start, end] of ranges) {
      if (start < end) {
        decorations.push(
          Decoration.inline(base + start, base + end, { class: 'md-syntax' })
        );
      }
    }
  });

  return DecorationSet.create(doc, decorations);
};

const MarkdownSyntaxDim = Extension.create({
  name: 'markdownSyntaxDim',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: markdownSyntaxDimKey,
        state: {
          init(_, { doc }) {
            return buildDecorations(doc);
          },
          apply(tr, old) {
            if (!tr.docChanged) return old;
            return buildDecorations(tr.doc);
          }
        },
        props: {
          decorations(state) {
            return markdownSyntaxDimKey.getState(state);
          }
        }
      })
    ];
  }
});

export { MarkdownSyntaxDim };
