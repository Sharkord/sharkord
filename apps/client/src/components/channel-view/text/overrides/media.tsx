import { FullScreenImage } from '@/components/fullscreen-image/content';
import { memo, useMemo } from 'react';
import Masonry from 'react-masonry-css';
import type { TFoundMedia } from '../renderer/types';
import { OverrideLayout } from './layout';
import { VideoPlayer } from './video-player';

type TMediaOverrideProps = {
  media: TFoundMedia[];
};

const MediaOverride = memo(({ media }: TMediaOverrideProps) => {
  const breakpointCols = useMemo(() => {
    const columnCount = Math.min(Math.max(media.length, 1), 4);

    return {
      default: columnCount,
      1400: Math.min(columnCount, 4),
      1100: Math.min(columnCount, 3),
      700: Math.min(columnCount, 2),
      520: 1
    };
  }, [media.length]);

  return (
    <OverrideLayout>
      <Masonry
        breakpointCols={breakpointCols}
        className="media-masonry-grid"
        columnClassName="media-masonry-grid_column"
      >
        {media.map((item) => {
          if (item.type === 'image') {
            return (
              <div className="media-masonry-item" key={item.key}>
                <FullScreenImage
                  src={item.url}
                  alt={`Media item ${item.key}`}
                  crossOrigin="anonymous"
                  className="media-masonry-asset media-masonry-image"
                />
              </div>
            );
          }

          if (item.type === 'video') {
            return (
              <div className="media-masonry-item" key={item.key}>
                <VideoPlayer url={item.url} className="media-masonry-video" />
              </div>
            );
          }

          return null;
        })}
      </Masonry>
    </OverrideLayout>
  );
});

export { MediaOverride };
