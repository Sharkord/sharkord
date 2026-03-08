import { Extension } from '@tiptap/core';
import type { Node } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

// each rule describes a markdown pattern and returns offsets (relative to
// match.index) of the syntax characters to dim -- not the content between them
type TTokenRule = {
  pattern: RegExp;
  // returns array of [relStart, relEnd] pairs relative to match.index
  syntaxOffsets: (match: RegExpExecArray) => Array<[number, number]>;
};

const TOKEN_RULES: TTokenRule[] = [
  // atx heading: # ## ### ... (the hashes + trailing space)
  {
    pattern: /^(#{1,6} )/gm,
    syntaxOffsets: (m) => [[0, m[1].length]]
  },
  // bold+italic combined: ***text***
  {
    pattern: /(\*\*\*)((?:[^*]|\*(?!\*\*))+?)(\*\*\*)/g,
    syntaxOffsets: (m) => {
      const openLen = 3;
      const closeStart = m[0].length - 3;
      return [
        [0, openLen],
        [closeStart, m[0].length]
      ];
    }
  },
  // bold: **text**
  {
    pattern: /(\*\*)((?:[^*]|\*(?!\*))+?)(\*\*)/g,
    syntaxOffsets: (m) => {
      const closeStart = m[0].length - 2;
      return [
        [0, 2],
        [closeStart, m[0].length]
      ];
    }
  },
  // bold alt: __text__
  {
    pattern: /(__)((?:[^_]|_(?!_))+?)(__)/g,
    syntaxOffsets: (m) => {
      const closeStart = m[0].length - 2;
      return [
        [0, 2],
        [closeStart, m[0].length]
      ];
    }
  },
  // italic: *text* (not preceded by another *, delimiters snug against non-whitespace)
  {
    pattern: /(?<!\*)\*(?!\*)(?=\S)((?:[^*])*\S)\*(?!\*)/g,
    syntaxOffsets: (m) => {
      return [
        [0, 1],
        [m[0].length - 1, m[0].length]
      ];
    }
  },
  // italic alt: _text_
  {
    pattern: /(?<!_)_(?!_)(?=\S)((?:[^_])*\S)_(?!_)/g,
    syntaxOffsets: (m) => {
      return [
        [0, 1],
        [m[0].length - 1, m[0].length]
      ];
    }
  },
  // strikethrough: ~~text~~
  {
    pattern: /(~~)((?:[^~]|~(?!~))+?)(~~)/g,
    syntaxOffsets: (m) => {
      const closeStart = m[0].length - 2;
      return [
        [0, 2],
        [closeStart, m[0].length]
      ];
    }
  },
  // inline code: `code` or ``code``
  {
    pattern: /(`+)((?:[^`])+?)(`+)/g,
    syntaxOffsets: (m) => {
      const openLen = m[1].length;
      const closeStart = m[0].length - m[3].length;
      return [
        [0, openLen],
        [closeStart, m[0].length]
      ];
    }
  },
  // blockquote: > at start of line
  {
    pattern: /^(> ?)/gm,
    syntaxOffsets: (m) => [[0, m[1].length]]
  },
  // unordered list: - * + at start of line followed by space
  {
    pattern: /^([-*+] )/gm,
    syntaxOffsets: (m) => [[0, m[1].length]]
  },
  // ordered list: 1. at start of line
  {
    pattern: /^(\d+\. )/gm,
    syntaxOffsets: (m) => [[0, m[1].length]]
  },
  // link: [text](url) -- dim brackets and parens
  {
    pattern: /(\[)((?:[^\]])*?)(\]\()([^)]*?)(\))/g,
    syntaxOffsets: (m) => {
      const openBracket: [number, number] = [0, 1];
      // close bracket + open paren starts after [text
      const closeBracketParen: [number, number] = [
        1 + m[2].length,
        1 + m[2].length + 2
      ];
      // close paren
      const closeParen: [number, number] = [m[0].length - 1, m[0].length];
      return [openBracket, closeBracketParen, closeParen];
    }
  }
];

const markdownSyntaxDimKey = new PluginKey<DecorationSet>('markdownSyntaxDim');

const buildDecorations = (doc: Node): DecorationSet => {
  const decorations: Decoration[] = [];

  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;

    const text = node.text;
    // pos is the start position of this text node in the document
    const basePos = pos;

    for (const rule of TOKEN_RULES) {
      rule.pattern.lastIndex = 0;

      let match: RegExpExecArray | null;

      while ((match = rule.pattern.exec(text)) !== null) {
        const offsets = rule.syntaxOffsets(match);

        for (const [relStart, relEnd] of offsets) {
          const absStart = basePos + match.index + relStart;
          const absEnd = basePos + match.index + relEnd;

          if (absStart < absEnd) {
            decorations.push(
              Decoration.inline(absStart, absEnd, {
                class: 'md-syntax'
              })
            );
          }
        }
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
