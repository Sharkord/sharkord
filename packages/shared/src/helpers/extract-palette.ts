const KMEANS_ITERATIONS = 10;

type TRgb = [number, number, number];

const rgbToHex = (r: number, g: number, b: number) =>
  '#' +
  [r, g, b]
    .map((x) => Math.round(x).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();

/**
 * k-means over RGB pixels, used to pull a small palette out of an avatar or
 * banner. Centroids are seeded evenly across the input instead of from the
 * first k pixels, which on a padded image would all be the same corner colour.
 */
const kmeans = (pixels: TRgb[], k: number): TRgb[] => {
  if (!pixels.length) return [];

  const count = Math.min(k, pixels.length);
  const step = Math.floor(pixels.length / count);
  const centroids: TRgb[] = Array.from(
    { length: count },
    (_, i) => [...pixels[i * step]!] as TRgb
  );

  for (let iteration = 0; iteration < KMEANS_ITERATIONS; iteration++) {
    const sums: TRgb[] = Array.from({ length: count }, () => [0, 0, 0]);
    const counts = new Array<number>(count).fill(0);

    for (const pixel of pixels) {
      let best = 0;
      let bestDistance = Infinity;

      for (let i = 0; i < count; i++) {
        const centroid = centroids[i]!;
        const distance =
          (pixel[0] - centroid[0]) ** 2 +
          (pixel[1] - centroid[1]) ** 2 +
          (pixel[2] - centroid[2]) ** 2;

        if (distance < bestDistance) {
          bestDistance = distance;
          best = i;
        }
      }

      sums[best]![0] += pixel[0];
      sums[best]![1] += pixel[1];
      sums[best]![2] += pixel[2];
      counts[best]!++;
    }

    for (let i = 0; i < count; i++) {
      if (!counts[i]) continue;

      centroids[i] = [
        Math.round(sums[i]![0] / counts[i]!),
        Math.round(sums[i]![1] / counts[i]!),
        Math.round(sums[i]![2] / counts[i]!)
      ];
    }
  }

  // two centroids can converge onto the same colour, don't show it twice
  const unique = new Map<string, TRgb>(
    centroids.map((centroid) => [rgbToHex(...centroid), centroid])
  );

  return [...unique.values()];
};

export { kmeans, rgbToHex, type TRgb };
