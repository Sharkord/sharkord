import { memo } from 'react';
import type { useVideoStats } from './hooks/use-video-stats';

type TStreamInfoProps = {
  mimeType: string | undefined;
  videoStats: ReturnType<typeof useVideoStats>;
  qualityLabel: string | null | undefined;
};

const StreamInfo = memo(
  ({ mimeType, videoStats, qualityLabel }: TStreamInfoProps) => {
    let codec: string | undefined;

    if (mimeType) {
      const [, subtype] = mimeType.split('/');

      codec = subtype ?? mimeType;
    }

    const parts: string[] = [];

    if (codec) parts.push(codec);

    if (videoStats) {
      let resolution = `${videoStats.width}x${videoStats.height}`;

      if (videoStats.frameRate > 0) {
        resolution += ` ${videoStats.frameRate}fps`;
      }

      parts.push(resolution);
    }

    if (qualityLabel) parts.push(`(${qualityLabel})`);

    if (parts.length === 0) return null;

    return (
      <span className="text-muted-foreground text-xs ml-2 leading-none">
        {parts.join(' ')}
      </span>
    );
  }
);

export { StreamInfo };
