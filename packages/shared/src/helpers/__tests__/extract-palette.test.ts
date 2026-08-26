import { describe, expect, test } from 'bun:test';
import { kmeans, rgbToHex, type TRgb } from '../extract-palette';

describe('rgbToHex', () => {
  test('pads and uppercases', () => {
    expect(rgbToHex(0, 0, 0)).toBe('#000000');
    expect(rgbToHex(255, 255, 255)).toBe('#FFFFFF');
    expect(rgbToHex(38, 38, 38)).toBe('#262626');
    expect(rgbToHex(171, 193, 35)).toBe('#ABC123');
  });
});

describe('kmeans', () => {
  test('returns nothing for no pixels', () => {
    expect(kmeans([], 6)).toEqual([]);
  });

  test('never returns more centroids than pixels', () => {
    expect(kmeans([[10, 20, 30]], 6)).toEqual([[10, 20, 30]]);
  });

  test('separates two well defined clusters', () => {
    const pixels: TRgb[] = [
      [250, 0, 0],
      [255, 5, 5],
      [245, 10, 0],
      [0, 0, 250],
      [5, 5, 255],
      [0, 10, 245]
    ];

    const palette = kmeans(pixels, 2).map(([r, g, b]) => rgbToHex(r, g, b));

    expect(palette).toHaveLength(2);
    expect(palette.some((c) => c.startsWith('#F'))).toBe(true);
    expect(palette.some((c) => c.endsWith('FA'))).toBe(true);
  });

  test('collapses duplicate centroids on a single colour image', () => {
    const pixels: TRgb[] = Array.from({ length: 50 }, () => [38, 38, 38]);

    expect(kmeans(pixels, 6)).toEqual([[38, 38, 38]]);
  });

  test('every channel stays a valid byte', () => {
    const pixels: TRgb[] = Array.from({ length: 200 }, (_, i) => [
      i % 256,
      (i * 7) % 256,
      (i * 13) % 256
    ]);

    for (const centroid of kmeans(pixels, 6)) {
      for (const channel of centroid) {
        expect(Number.isInteger(channel)).toBe(true);
        expect(channel).toBeGreaterThanOrEqual(0);
        expect(channel).toBeLessThanOrEqual(255);
      }
    }
  });
});
