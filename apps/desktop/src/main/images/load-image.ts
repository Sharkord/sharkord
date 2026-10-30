import { nativeImage, type NativeImage, type Session } from 'electron';
import { readCapped } from './read-capped';

const FETCH_TIMEOUT_MS = 2_000;

const loadImage = async (
  url: string,
  session: Session
): Promise<NativeImage | undefined> => {
  if (url.startsWith('data:')) {
    const image = nativeImage.createFromDataURL(url);

    return image.isEmpty() ? undefined : image;
  }

  try {
    const response = await session.fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
    });

    if (!response.ok) {
      return undefined;
    }

    const buffer = await readCapped(response);

    if (!buffer) {
      return undefined;
    }

    const image = nativeImage.createFromBuffer(buffer);

    return image.isEmpty() ? undefined : image;
  } catch {
    return undefined;
  }
};

export { loadImage };
