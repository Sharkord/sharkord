import { memo, type RefObject } from 'react';
import { useVideoStats } from './hooks/use-video-stats';

type TStreamInfoProps = {
  videoRef: RefObject<HTMLVideoElement | null>;
  mimeType: string | undefined;
  qualityLabel: string | null | undefined;
};

const StreamInfo = memo(
  ({ videoRef, mimeType, qualityLabel }: TStreamInfoProps) => {
    const videoStats = useVideoStats(videoRef, true);

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
