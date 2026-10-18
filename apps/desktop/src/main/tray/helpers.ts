import type { TDesktopUnreadState } from '@sharkord/shared';
import { nativeImage, type NativeImage } from 'electron';

type TTrayIndicator = 'none' | 'unread' | 'mention';

type TBgra = [number, number, number, number];

const TRAY_ICON_SIZE = 32;
const DOT_RADIUS = 7;
const DOT_OUTLINE = 2;
const DOT_CENTER = TRAY_ICON_SIZE - DOT_RADIUS - 1;

// bitmaps are bgra
const WHITE: TBgra = [255, 255, 255, 255];
const RED: TBgra = [68, 68, 239, 255];
const OUTLINE: TBgra = [26, 26, 26, 255];

const withDot = (image: NativeImage, color: TBgra) => {
  const bitmap = image.toBitmap();

  for (let y = 0; y < TRAY_ICON_SIZE; y++) {
    for (let x = 0; x < TRAY_ICON_SIZE; x++) {
      const distance = Math.hypot(x - DOT_CENTER, y - DOT_CENTER);

      if (distance > DOT_RADIUS) {
        continue;
      }

      const pixel = distance > DOT_RADIUS - DOT_OUTLINE ? OUTLINE : color;

      bitmap.set(pixel, (y * TRAY_ICON_SIZE + x) * 4);
    }
  }

  return nativeImage.createFromBitmap(bitmap, {
    width: TRAY_ICON_SIZE,
    height: TRAY_ICON_SIZE
  });
};

const getIndicator = (
  unread: Record<string, TDesktopUnreadState>
): TTrayIndicator => {
  const states = Object.values(unread);

  if (states.some(({ mentioned }) => mentioned)) {
    return 'mention';
  }

  if (states.some(({ count }) => count > 0)) {
    return 'unread';
  }

  return 'none';
};

export { getIndicator, RED, TRAY_ICON_SIZE, WHITE, withDot };
export type { TTrayIndicator };
