import { MentionChip } from '@/components/mention-chip';
import { Node } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react';
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
  }
});
