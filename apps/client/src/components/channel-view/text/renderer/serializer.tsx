import { parseDomCommand } from '@sharkord/shared';
import { Element, type DOMNode } from 'html-react-parser';
import { CommandOverride } from '../overrides/command';
import { MentionOverride } from '../overrides/mention';
import { TwitterOverride } from '../overrides/twitter';
import { YoutubeOverride } from '../overrides/youtube';
import { getTweetInfo, getYoutubeInfo } from './helpers';

const serializer = (domNode: DOMNode, messageId: number) => {
  try {
    if (domNode instanceof Element && domNode.name === 'a') {
      const href = domNode.attribs.href;

      if (!URL.canParse(href)) {
        return null;
      }

      const { isTweet, tweetId } = getTweetInfo(href);
      const { isYoutube, videoId } = getYoutubeInfo(href);

      if (isTweet) {
        if (tweetId) {
          return <TwitterOverride tweetId={tweetId} />;
        }
      } else if (isYoutube) {
        if (videoId) {
          return <YoutubeOverride videoId={videoId} />;
        }
      }
    } else if (domNode instanceof Element && domNode.name === 'command') {
      const command = parseDomCommand(domNode);

      return <CommandOverride command={command} />;
    } else if (
      domNode instanceof Element &&
      domNode.name === 'span' &&
      domNode.attribs['data-type'] === 'mention' &&
      domNode.attribs['data-user-id']
    ) {
      const userId = parseInt(domNode.attribs['data-user-id'], 10);

      if (!Number.isNaN(userId)) {
        return <MentionOverride userId={userId} />;
      }
    }
  } catch (error) {
    console.error(`Error parsing DOM node for message ID ${messageId}:`, error);
  }

  return null;
};

export { serializer };
