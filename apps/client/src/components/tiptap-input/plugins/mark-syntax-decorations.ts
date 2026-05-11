import { Extension } from '@tiptap/core';
import type { Node } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

const markSyntaxKey = new PluginKey('markSyntax');

// inline mark patterns
const INLINE_PATTERNS: Array<{ re: RegExp; delimLen: number }> = [
  { re: /\*\*[^*\n]+\*\*/g, delimLen: 2 }, // **bold**
  { re: /~~[^~\n]+~~/g, delimLen: 2 }, // ~~strike~~
  { re: /\*[^*\n]+\*/g, delimLen: 1 }, // *italic*
  { re: /`[^`\n]+`/g, delimLen: 1 } // `code`
];

// block mark patterns
const HEADING_RE = /^#{1,6} /gm;
const UL_RE = /^[*-] /gm;
const OL_RE = /^\d+\. /gm;
const BQ_RE = /^> /gm;

const buildDecorations = (doc: Node): DecorationSet => {
  const decorations: Decoration[] = [];

  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;

    // heading / list prefix -- dim the entire prefix including trailing space
    HEADING_RE.lastIndex = 0;
    UL_RE.lastIndex = 0;
    OL_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    for (const re of [HEADING_RE, UL_RE, OL_RE, BQ_RE]) {
      re.lastIndex = 0;
      while ((m = re.exec(node.text)) !== null) {
        const start = pos + m.index;
        decorations.push(
          Decoration.inline(start, start + m[0].length, {
            class: 'mark-syntax'
          })
        );
      }
    }

    // inline marks -- dim opening and closing delimiters only
    for (const { re, delimLen } of INLINE_PATTERNS) {
      re.lastIndex = 0;
      while ((m = re.exec(node.text)) !== null) {
        const start = pos + m.index;
        const end = start + m[0].length;
        decorations.push(
          Decoration.inline(start, start + delimLen, { class: 'mark-syntax' })
        );
        decorations.push(
          Decoration.inline(end - delimLen, end, { class: 'mark-syntax' })
        );
      }
    }
  });

  return DecorationSet.create(doc, decorations);
};

export const MarkSyntaxDecorations = Extension.create({
  name: 'markSyntaxDecorations',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: markSyntaxKey,
        state: {
          init: (_, state) => buildDecorations(state.doc),
          apply: (tr, old) => (tr.docChanged ? buildDecorations(tr.doc) : old)
        },
        props: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          decorations: (state): any => markSyntaxKey.getState(state)
        }
      })
    ];
  }
});
