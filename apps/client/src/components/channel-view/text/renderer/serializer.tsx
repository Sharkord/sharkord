import { ChannelChip } from '@/components/channel-chip';
import { RoleMentionChip } from '@/components/role-mention-chip';
import { MessageNodeType, parseDomCommand } from '@sharkord/shared';
import { Element, type DOMNode } from 'html-react-parser';
import { CommandOverride } from '../overrides/command';
import { MentionOverride } from '../overrides/mention';

const serializer = (domNode: DOMNode, messageId: number) => {
  try {
    if (domNode instanceof Element && domNode.name === 'command') {
      const command = parseDomCommand(domNode);

      return <CommandOverride command={command} />;
    } else if (
      domNode instanceof Element &&
      domNode.name === 'span' &&
      domNode.attribs['data-type'] === MessageNodeType.MENTION &&
      domNode.attribs['data-user-id']
    ) {
      const userId = parseInt(domNode.attribs['data-user-id'], 10);

      if (!Number.isNaN(userId)) {
        return <MentionOverride userId={userId} />;
      }
    } else if (
      domNode instanceof Element &&
      domNode.name === 'span' &&
      domNode.attribs['data-type'] === MessageNodeType.ROLE_MENTION &&
      domNode.attribs['data-role-id']
    ) {
      const roleId = parseInt(domNode.attribs['data-role-id'], 10);

      if (!Number.isNaN(roleId)) {
        return <RoleMentionChip roleId={roleId} />;
      }
    } else if (
      domNode instanceof Element &&
      domNode.name === 'span' &&
      domNode.attribs['data-type'] === MessageNodeType.CHANNEL_REFERENCE &&
      domNode.attribs['data-channel-id']
    ) {
      const channelId = parseInt(domNode.attribs['data-channel-id'], 10);

      if (!Number.isNaN(channelId)) {
        return <ChannelChip channelId={channelId} />;
      }
    }
  } catch (error) {
    console.error(`Error parsing DOM node for message ID ${messageId}:`, error);
  }

  return undefined;
};

export { serializer };
