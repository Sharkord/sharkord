import { extractUrls, type TMessageMetadata } from '@sharkord/shared';
import dns from 'dns';
import { eq } from 'drizzle-orm';
import { getLinkPreview } from 'link-preview-js';
import { isIP } from 'net';
import { db } from '../../db';
import { messages } from '../../db/schema';
import { isPrivateIP } from '../../helpers/network';
import {
  createDirectMediaMetadata,
  createOpenGraphMetadata,
  getDirectMediaMetaFromUrl,
  sanitizeContent
} from './helpers';

const metadataCache = new Map<string, TMessageMetadata | undefined>();

setInterval(
  () => metadataCache.clear(),
  1000 * 60 * 60 * 2 // clear cache every 2 hours
);

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

      if (isDirectMediaLink && mediaType !== 'none') {
        const directMetadata = createDirectMediaMetadata(
          url,
          parsed,
          mediaType
        );

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

      const normalizedMetadata = createOpenGraphMetadata(metadata, url);

      metadataCache.set(url, normalizedMetadata);

      return normalizedMetadata;
    });

    const metadata = await Promise.all(promises);
    const validMetadata = (metadata ?? []).filter((item) => !!item);

    return validMetadata;
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
