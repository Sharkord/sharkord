import { Transform } from 'stream';
import { resolvePublicAddress } from '../../helpers/network';

const getMimeType = (contentType: string | null): string => {
  if (!contentType) return '';

  const [mimeType = ''] = contentType.split(';');
  const trimmed = mimeType.trim();

  return trimmed.toLowerCase();
};

const getTotalSize = (headers: Headers): number | undefined => {
  const contentRange = headers.get('content-range');
  const contentLength = headers.get('content-length');
  let size = NaN;

  if (contentRange) {
    const [, total = ''] = contentRange.split('/');

    size = Number(total);
  } else if (contentLength) {
    size = Number(contentLength);
  }

  return Number.isFinite(size) ? size : undefined;
};

const fetchPublicMedia = async (
  url: string,
  range: string | undefined,
  maxRedirects: number,
  signal: AbortSignal
): Promise<Response | undefined> => {
  let currentUrl = url;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    if (!URL.canParse(currentUrl)) return undefined;

    const { protocol, hostname } = new URL(currentUrl);

    if (protocol !== 'http:' && protocol !== 'https:') return undefined;

    const address = await resolvePublicAddress(hostname);

    if (!address) return undefined;

    const headers: Record<string, string> = {
      'accept-encoding': 'identity'
    };

    if (range) headers.range = range;

    const response = await fetch(currentUrl, {
      redirect: 'manual',
      headers,
      signal
    });

    const location = response.headers.get('location');
    const isRedirect = response.status >= 300 && response.status < 400;

    if (!isRedirect || !location) return response;

    await response.body?.cancel();

    const nextUrl = new URL(location, currentUrl);

    currentUrl = nextUrl.toString();
  }

  return undefined;
};

const createSizeLimiter = (maxBytes: number) => {
  let received = 0;

  return new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      received += chunk.length;

      if (received > maxBytes) {
        callback(new Error('Media is larger than the proxy limit'));

        return;
      }

      callback(null, chunk);
    }
  });
};

export { createSizeLimiter, fetchPublicMedia, getMimeType, getTotalSize };
