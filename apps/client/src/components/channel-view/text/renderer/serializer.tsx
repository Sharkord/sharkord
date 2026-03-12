import { imageExtensions, parseDomCommand } from '@sharkord/shared';
import { Element, type DOMNode } from 'html-react-parser';
import { CommandOverride } from '../overrides/command';
import { EmojiOverride } from '../overrides/emoji';
import { MentionOverride } from '../overrides/mention';
import { TwitterOverride } from '../overrides/twitter';
import { YoutubeOverride } from '../overrides/youtube';
import type { TFoundMedia } from './types';

const twitterRegex = /https:\/\/(twitter|x).com\/\w+\/status\/(\d+)/g;
const youtubeRegex =
  /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;

const serializer = (
  domNode: DOMNode,
  pushMedia: (media: TFoundMedia) => void,
  messageId: number
) => {
  try {
    if (domNode instanceof Element && domNode.name === 'a') {
      const href = domNode.attribs.href;

      if (!URL.canParse(href)) {
        return null;
      }

      const url = new URL(href);

      const isTweet =
        url.hostname.match(/(twitter|x).com/) && href.match(twitterRegex);
      const isYoutube =
        url.hostname.match(/(youtube.com|youtu.be)/) &&
        href.match(youtubeRegex);

      const isImage = imageExtensions.some((ext) => href.endsWith(ext));

      if (isTweet) {
        const tweetId = href.match(twitterRegex)?.[0].split('/').pop();

        if (tweetId) {
          return <TwitterOverride tweetId={tweetId} />;
        }
      } else if (isYoutube) {
        const videoId = href.match(
          /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/
        )?.[7];

        if (videoId) {
          return <YoutubeOverride videoId={videoId} />;
        }
      } else if (isImage) {
        pushMedia({ type: 'image', url: href });

        return;
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
    } else if (
      domNode instanceof Element &&
      domNode.name === 'span' &&
      domNode.attribs['data-type'] === 'emoji'
    ) {
      // prefer data-name attribute; fall back to stripping colons from text
      // content for messages stored before data-name was added
      const name =
        domNode.attribs['data-name'] ||
        domNode.children
          .map((c) => ('data' in c ? (c as { data: string }).data : ''))
          .join('')
          .replace(/^:|:$/g, '');
      if (name) return <EmojiOverride name={name} />;
    }
  } catch (error) {
    console.error(`Error parsing DOM node for message ID ${messageId}:`, error);
  }

  return null;
};

export { serializer };
