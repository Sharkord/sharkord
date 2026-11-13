import { isCroppableImage } from '@/helpers/crop-image';
import { describe, expect, it } from 'bun:test';

const bytes = (text: string) => new TextEncoder().encode(text);

describe('isCroppableImage', () => {
  it('crops static jpeg, png and webp images', () => {
    expect(isCroppableImage('image/jpeg', bytes('JFIF data'))).toBe(true);
    expect(isCroppableImage('image/png', bytes('PNG IHDR IDAT'))).toBe(true);
    expect(isCroppableImage('image/webp', bytes('RIFF WEBPVP8 '))).toBe(true);
  });

  it('skips animated png and webp images', () => {
    expect(isCroppableImage('image/png', bytes('PNG IHDR acTL IDAT'))).toBe(
      false
    );
    expect(isCroppableImage('image/apng', bytes('PNG acTL'))).toBe(false);
    expect(isCroppableImage('image/webp', bytes('RIFF WEBPVP8X ANIM'))).toBe(
      false
    );
  });

  it('skips gifs and svgs', () => {
    expect(isCroppableImage('image/gif', bytes('GIF89a'))).toBe(false);
    expect(isCroppableImage('image/svg+xml', bytes('<svg />'))).toBe(false);
  });
});
