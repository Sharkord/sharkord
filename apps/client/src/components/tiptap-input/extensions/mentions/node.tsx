import { MentionChip } from '@/components/mention-chip';
import { Node } from '@tiptap/core';
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps
} from '@tiptap/react';
import { memo } from 'react';

const MentionNodeView = memo(({ node }: NodeViewProps) => (
  <NodeViewWrapper as="span" className="mention-inline">
    <MentionChip userId={Number(node.attrs.userId)} label={node.attrs.label} />
  </NodeViewWrapper>
));

export const MentionNode = Node.create({
  name: 'mention',
  group: 'inline',
  inline: true,
  atom: true,

  addNodeView() {
    return ReactNodeViewRenderer(MentionNodeView, { as: 'span' });
  },

  addAttributes() {
    return {
      userId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-user-id')?.trim() || null,
        renderHTML: (attrs) =>
          attrs.userId != null ? { 'data-user-id': String(attrs.userId) } : {}
      },
      label: {
        default: '',
        parseHTML: (el) =>
          (el as HTMLElement).textContent?.replace(/^@/, '') ?? '',
        renderHTML: () => ({})
      }
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="mention"]',
        getAttrs: (dom) => {
          const el = dom as HTMLElement;
          const userId = el.getAttribute('data-user-id')?.trim();
          const label = el.textContent?.replace(/^@/, '') ?? '';

          return userId ? { userId, label } : false;
        }
      }
    ];
  },

  renderHTML({ node }) {
    return [
      'span',
      {
        'data-type': 'mention',
        'data-user-id': String(node.attrs.userId),
        class: 'mention'
      },
      `@${node.attrs.label ?? ''}`
    ];
  },

  parseMarkdown: (token, helpers) => {
    const raw = token.raw || '';
    const match = raw.match(/data-user-id="([^"]+)"/);
    const userId = match ? match[1] : null;
    const label = raw
      .replace(/^<span[^>]*>/, '')
      .replace(/<\/span>$/, '')
      .replace(/^@/, '');

    return helpers.createNode('mention', { userId, label });
  },

  renderMarkdown: (node) => {
    const userId = (node.attrs as { userId?: string })?.userId ?? '';
    const label = (node.attrs as { label?: string })?.label ?? '';
    return `<span data-type="mention" data-user-id="${userId}" class="mention">@${label}</span>`;
  },

  markdownTokenizer: {
    name: 'mention',
    level: 'inline',
    start: (src: string) => src.indexOf('<span data-type="mention"'),
    tokenize: (src: string) => {
      const match = src.match(
        /^<span data-type="mention"[^>]*>[\s\S]*?<\/span>/
      );
      if (!match) return undefined;

      return {
        type: 'mention',
        raw: match[0],
        content: match[0]
      };
    }
  }
});
