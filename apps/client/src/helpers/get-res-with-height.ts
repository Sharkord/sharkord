import { Resolution } from '@/types';

const getResWidthHeight = (
  resolution: Resolution | undefined
): { width: number; height: number } => {
  switch (resolution) {
    case Resolution['240p']:
      return { width: 320, height: 240 };
    case Resolution['360p']:
      return { width: 640, height: 360 };
    case Resolution['480p']:
      return { width: 640, height: 480 };
    case Resolution['720p']:
      return { width: 1280, height: 720 };
    case Resolution['1080p']:
      return { width: 1920, height: 1080 };
    case Resolution['1440p']:
      return { width: 2560, height: 1440 };
    case Resolution['2160p']:
      return { width: 3840, height: 2160 };
    default:
      return { width: 1280, height: 720 };
  }
};

export { getResWidthHeight };
