import { ChannelChip } from '@/components/channel-chip';
import { Node } from '@tiptap/core';
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps
} from '@tiptap/react';
import { memo } from 'react';

const ChannelReferenceNodeView = memo(({ node }: NodeViewProps) => (
  <NodeViewWrapper as="span" className="channel-reference-inline">
    <ChannelChip channelId={Number(node.attrs.channelId)} />
  </NodeViewWrapper>
));

export const ChannelReferenceNode = Node.create({
  name: 'channelReference',
  group: 'inline',
  inline: true,
  atom: true,

  addNodeView() {
    return ReactNodeViewRenderer(ChannelReferenceNodeView, { as: 'span' });
  },

  addAttributes() {
    return {
      channelId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-channel-id')?.trim() || null,
        renderHTML: (attrs) =>
          attrs.channelId != null
            ? { 'data-channel-id': String(attrs.channelId) }
            : {}
      }
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="channel-reference"]',
        getAttrs: (dom) => {
          const channelId = (dom as HTMLElement)
            .getAttribute('data-channel-id')
            ?.trim();

          return channelId ? { channelId } : false;
        }
      }
    ];
  },

  renderHTML({ node }) {
    return [
      'span',
      {
        'data-type': 'channel-reference',
        'data-channel-id': String(node.attrs.channelId),
        class: 'channel-reference'
      }
    ];
  }
});
