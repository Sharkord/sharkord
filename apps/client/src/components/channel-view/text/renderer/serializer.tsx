import { ChannelChip } from '@/components/channel-chip';
import { parseDomCommand } from '@sharkord/shared';
import { Element, type DOMNode } from 'html-react-parser';
import { CommandOverride } from '../overrides/command';
import { MentionOverride } from '../overrides/mention';
import { YoutubeOverride } from '../overrides/youtube';
import { getEmbedOnlyParagraphAnchor } from './embed-paragraph';
import { getYoutubeInfo } from './helpers';

const getYoutubeOverride = (href: string) => {
  const { videoId } = getYoutubeInfo(href);

  return videoId === undefined ? undefined : (
    <YoutubeOverride videoId={videoId} />
  );
};

const serializer = (domNode: DOMNode, messageId: number) => {
  try {
    if (!(domNode instanceof Element)) {
      return undefined;
    }

    if (
      domNode.name === 'a' &&
      domNode.attribs.href &&
      URL.canParse(domNode.attribs.href)
    ) {
      return getYoutubeOverride(domNode.attribs.href);
    }

    if (domNode.name === 'p') {
      // an embed override is a block, and a block inside a `p` is invalid html: the
      // browser closes the paragraph before it, so the client DOM stops matching the
      // server's and react reports a hydration error for every embed on screen. the
      // override is returned for the paragraph instead of for the anchor it wrapped,
      // which lands it as a sibling of the surrounding blocks where it belongs
      const embedOnlyAnchor = getEmbedOnlyParagraphAnchor(domNode);

      if (embedOnlyAnchor) {
        return getYoutubeOverride(embedOnlyAnchor.attribs.href);
      }
    }

    if (domNode.name === 'command') {
      const command = parseDomCommand(domNode);

      return <CommandOverride command={command} />;
    }

    if (
      domNode.name === 'span' &&
      domNode.attribs['data-type'] === 'mention' &&
      domNode.attribs['data-user-id']
    ) {
      const userId = parseInt(domNode.attribs['data-user-id'], 10);

      if (!Number.isNaN(userId)) {
        return <MentionOverride userId={userId} />;
      }
    }

    if (
      domNode.name === 'span' &&
      domNode.attribs['data-type'] === 'channel-reference' &&
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
