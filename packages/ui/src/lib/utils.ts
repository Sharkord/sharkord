import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

type RGB = [number, number, number];

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function rgbToHex(r: number, g: number, b: number): string {
  const color =
    '#' +
    [r, g, b]
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();

  return color;
}

export function kmeans(points: RGB[], k: number, iterations = 10) {
  const centroids: RGB[] = points.slice(0, k).map((p) => [...p]);

  for (let iter = 0; iter < iterations; iter++) {
    const groups: RGB[][] = new Array(k);

    for (let i = 0; i < k; i++) {
      groups[i] = [];
    }

    for (const p of points) {
      let best = 0;
      let bestDist = Infinity;

      for (let i = 0; i < k; i++) {
        const c = centroids[i]!;

        const dist =
          (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2;

        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      }

      groups[best]!.push(p);
    }

    for (let i = 0; i < k; i++) {
      if (!groups[i]!.length) continue;

      const avg = groups[i]!.reduce(
        (acc, p) => {
          acc[0] += p[0];
          acc[1] += p[1];
          acc[2] += p[2];
          return acc;
        },
        [0, 0, 0]
      );

      centroids[i] = [
        Math.round(avg[0] / groups[i]!.length),
        Math.round(avg[1] / groups[i]!.length),
        Math.round(avg[2] / groups[i]!.length)
      ];
    }
  }

  return centroids;
}
