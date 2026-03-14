import {
  audioExtensions,
  extractUrls,
  imageExtensions,
  removeCommandElements,
  removeEmojiElements,
  videoExtensions,
  type TGenericObject,
  type TMessageMetadata
} from '@sharkord/shared';
import dns from 'dns';
import { eq } from 'drizzle-orm';
import { getLinkPreview } from 'link-preview-js';
import { isIP } from 'net';
import { db } from '../../db';
import { messages } from '../../db/schema';
import { isPrivateIP } from '../../helpers/network';

const metadataCache = new Map<string, TGenericObject>();

setInterval(
  () => metadataCache.clear(),
  1000 * 60 * 60 * 2 // clear cache every 2 hours
);

// if it ends in a known media extension, we just assume it's a direct media link and skip the DNS resolution and metadata fetching
// there might be cases where this is not true, but it's a good heuristic to avoid unnecessary work
const getDirectMediaMetaFromUrl = (
  parsedUrl: URL
): {
  isDirectMediaLink: boolean;
  mediaType: 'image' | 'video' | 'audio' | 'none';
} => {
  try {
    const pathname = parsedUrl.pathname.toLowerCase();

    const isImage = imageExtensions.some((ext) => pathname.endsWith(ext));

    if (isImage) {
      return { isDirectMediaLink: true, mediaType: 'image' };
    }

    const isAudio = audioExtensions.some((ext) => pathname.endsWith(ext));

    if (isAudio) {
      return { isDirectMediaLink: true, mediaType: 'audio' };
    }

    const isVideo = videoExtensions.some((ext) => pathname.endsWith(ext));

    if (isVideo) {
      return { isDirectMediaLink: true, mediaType: 'video' };
    }
  } catch {
    // ignore
  }

  return { isDirectMediaLink: false, mediaType: 'none' };
};

const sanitizeContent = (content: string): string => {
  let cleanContent = content;

  // this will remove plugin commands AND emojis because they need to be ignored for metadata extraction
  cleanContent = removeCommandElements(cleanContent);
  cleanContent = removeEmojiElements(cleanContent);

  return cleanContent;
};

const urlMetadataParser = async (
  content: string
): Promise<TMessageMetadata[]> => {
  try {
    const cleanContent = sanitizeContent(content);
    const urls = extractUrls(cleanContent);

    if (!urls) return [];

    const promises = urls.map(async (url) => {
      if (metadataCache.has(url)) return metadataCache.get(url);

      if (!URL.canParse(url)) {
        return;
      }

      const parsed = new URL(url);

      const isEmojiImage =
        parsed.hostname === 'cdn.jsdelivr.net' &&
        parsed.pathname.includes('emoji-datasource');

      // it's a tiptap emoji, ignore
      if (isEmojiImage) return;

      // allow only http and https protocols
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return;
      }

      // it's already an ip address, check if it's private
      if (isIP(parsed.hostname) && isPrivateIP(parsed.hostname)) {
        return;
      }

      // if the URL has a known media extension, skip getLinkPreview entirely and use extension-based detection
      const { isDirectMediaLink, mediaType } =
        getDirectMediaMetaFromUrl(parsed);

      if (isDirectMediaLink) {
        const directMetadata: TMessageMetadata = {
          url,
          title: parsed.pathname.split('/').pop() || url,
          description: '',
          mediaType
        };

        metadataCache.set(url, directMetadata);

        return directMetadata;
      }

      let metadata;

      try {
        metadata = await getLinkPreview(url, {
          followRedirects: 'follow',
          resolveDNSHost: async (url: string) => {
            return new Promise((resolve, reject) => {
              try {
                const hostname = new URL(url).hostname;

                dns.lookup(hostname, { all: true }, (err, addresses) => {
                  if (err) {
                    reject(err);
                    return;
                  }

                  for (const entry of addresses) {
                    if (isPrivateIP(entry.address)) {
                      reject(new Error('Cannot resolve private IP addresses'));
                      return;
                    }
                  }

                  const firstAddress = addresses[0]?.address;

                  if (!firstAddress) {
                    reject(new Error('No addresses found'));
                    return;
                  }

                  resolve(firstAddress);
                });
              } catch (error) {
                reject(error);
              }
            });
          }
        });
      } catch {
        // getLinkPreview failed (blocked, timeout, etc.)
      }

      if (!metadata) return;

      metadataCache.set(url, metadata);

      return metadata;
    });

    const metadata = (await Promise.all(
      promises
    )) as (TMessageMetadata | null)[]; // TODO: fix these types

    const validMetadata = (metadata ?? []).filter((m) => !!m);

    return validMetadata ?? [];
  } catch {
    // ignore
  }

  return [];
};

export const processMessageMetadata = async (
  content: string,
  messageId: number
) => {
  const metadata = await urlMetadataParser(content);

  const hasMetadata = metadata && metadata.length > 0;

  if (!hasMetadata) return;

  return db
    .update(messages)
    .set({
      metadata,
      updatedAt: Date.now()
    })
    .where(eq(messages.id, messageId))
    .returning()
    .get();
};
