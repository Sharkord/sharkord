import { memo } from 'react';
import { OverrideLayout } from './layout';
import { VideoPlayer } from './video-player';

type TYoutubeOverrideProps = {
  videoId: string;
};

const YoutubeOverride = memo(({ videoId }: TYoutubeOverrideProps) => {
  return (
    <OverrideLayout>
      <VideoPlayer url={`https://www.youtube.com/watch?v=${videoId}`} />
    </OverrideLayout>
  );
});

export { YoutubeOverride };
