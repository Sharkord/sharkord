import type { TGenericObject, TMessageMetadata } from '@sharkord/shared';
import dns from 'dns';
import { eq } from 'drizzle-orm';
import ipaddr from 'ipaddr.js';
import { getLinkPreview } from 'link-preview-js';
import { isIP } from 'net';
import { db } from '../../db';
import { messages } from '../../db/schema';
import { extractUrls } from '../../helpers/urls-extractor';

const metadataCache = new Map<string, TGenericObject>();

setInterval(
  () => metadataCache.clear(),
  1000 * 60 * 60 * 2 // clear cache every 2 hours
);

const isPrivateIP = (ip: string): boolean => {
  try {
    const addr = ipaddr.parse(ip);
    const range = addr.range();

    const blockedRanges = [
      'unspecified',
      'broadcast',
      'multicast',
      'linkLocal',
      'loopback',
      'private',
      'uniqueLocal'
    ];

    return blockedRanges.includes(range);
  } catch {
    return true; // if we can't parse it, block it
  }
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
