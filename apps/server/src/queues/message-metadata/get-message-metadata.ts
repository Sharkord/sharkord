import {
  audioExtensions,
  extractUrls,
  imageExtensions,
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
import { getErrorMessage } from '../../helpers/get-error-message';
import { isPrivateIP } from '../../helpers/network';
import { logger } from '../../logger';

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

const urlMetadataParser = async (
  content: string
): Promise<TMessageMetadata[]> => {
  try {
    const urls = extractUrls(content);

    if (!urls) return [];

    const promises = urls.map(async (url) => {
      if (metadataCache.has(url)) return metadataCache.get(url);

      if (!URL.canParse(url)) {
        return;
      }

      const parsed = new URL(url);

      // allow only http and https protocols
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return;
      }

      // it's already an ip address, check if it's private
      if (isIP(parsed.hostname) && isPrivateIP(parsed.hostname)) {
        return;
      }

      const { isDirectMediaLink, mediaType } =
        getDirectMediaMetaFromUrl(parsed);

      if (isDirectMediaLink) {
        const metadata: TMessageMetadata = {
          url,
          title: parsed.pathname.split('/').pop() || url,
          description: '',
          mediaType
        };

        metadataCache.set(url, metadata);

        return metadata;
      }

      const metadata = await getLinkPreview(url, {
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

      if (!metadata) return;

      metadataCache.set(url, metadata);

      return metadata;
    });

    const metadata = (await Promise.all(promises)) as TMessageMetadata[]; // TODO: fix these types

    return metadata ?? [];
  } catch (error) {
    logger.error('Error parsing URL metadata: %s', getErrorMessage(error));
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
