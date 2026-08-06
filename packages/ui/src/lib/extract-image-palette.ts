import { kmeans, rgbToHex, type TRgb } from '@sharkord/shared';

const SWATCH_COUNT = 6;
const SAMPLE_WIDTH = 100;
const MIN_ALPHA = 125;

/**
 * Draws an already loaded image into a scratch canvas at a fixed width and
 * clusters the pixels into a small palette. Returns nothing when the canvas
 * is tainted, which happens if the file was served without permissive CORS
 * headers, so callers should render the image with crossOrigin="anonymous".
 */
const extractImagePalette = (image: HTMLImageElement): string[] => {
  if (!image.naturalWidth) return [];

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });

  if (!context) return [];

  canvas.width = SAMPLE_WIDTH;
  canvas.height = Math.max(
    1,
    Math.round((image.naturalHeight / image.naturalWidth) * SAMPLE_WIDTH)
  );
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  let data: Uint8ClampedArray;

  try {
    data = context.getImageData(0, 0, canvas.width, canvas.height).data;
  } catch {
    return [];
  }

  const pixels: TRgb[] = [];

  for (let i = 0; i < data.length; i += 4) {
    if ((data[i + 3] ?? 255) < MIN_ALPHA) continue;

    pixels.push([data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0]);
  }

  return kmeans(pixels, SWATCH_COUNT).map(([r, g, b]) => rgbToHex(r, g, b));
};

export { extractImagePalette };
