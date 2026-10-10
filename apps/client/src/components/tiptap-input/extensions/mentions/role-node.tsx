import { RoleMentionChip } from '@/components/role-mention-chip';
import { MessageNodeType } from '@sharkord/shared';
import { Node } from '@tiptap/core';
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps
} from '@tiptap/react';
import { memo } from 'react';

const RoleMentionNodeView = memo(({ node }: NodeViewProps) => (
  <NodeViewWrapper as="span" className="mention-inline">
    <RoleMentionChip
      roleId={Number(node.attrs.roleId)}
      label={node.attrs.label}
    />
  </NodeViewWrapper>
));

export const RoleMentionNode = Node.create({
  name: 'roleMention',
  group: 'inline',
  inline: true,
  atom: true,

  addNodeView() {
    return ReactNodeViewRenderer(RoleMentionNodeView, { as: 'span' });
  },

  addAttributes() {
    return {
      roleId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-role-id')?.trim() || null,
        renderHTML: (attrs) =>
          attrs.roleId != null ? { 'data-role-id': String(attrs.roleId) } : {}
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
        tag: `span[data-type="${MessageNodeType.ROLE_MENTION}"]`,
        getAttrs: (dom) => {
          const el = dom as HTMLElement;
          const roleId = el.getAttribute('data-role-id')?.trim();
          const label = el.textContent?.replace(/^@/, '') ?? '';

          return roleId ? { roleId, label } : false;
        }
      }
    ];
  },

  renderHTML({ node }) {
    return [
      'span',
      {
        'data-type': MessageNodeType.ROLE_MENTION,
        'data-role-id': String(node.attrs.roleId),
        class: 'role-mention'
      },
      `@${node.attrs.label ?? ''}`
    ];
  }
});
