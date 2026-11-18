import { cn } from '@sharkord/ui';
import { memo } from 'react';
import ReactPlayer from 'react-player';

type TVideoPlayerProps = {
  url: string;
  className?: string;
  thumbnail?: string;
  thumbnailLabel?: string;
};

const VideoPlayer = memo(
  ({ url, className, thumbnail, thumbnailLabel }: TVideoPlayerProps) => {
    return (
      <div className={cn('aspect-video w-150 max-w-full', className)}>
        <ReactPlayer
          src={url}
          controls
          light={thumbnail}
          previewAriaLabel={thumbnailLabel}
          playing={thumbnail ? true : undefined}
          width="100%"
          height="100%"
          style={{
            colorScheme: 'dark'
          }}
        />
      </div>
    );
  }
);

export { VideoPlayer };
