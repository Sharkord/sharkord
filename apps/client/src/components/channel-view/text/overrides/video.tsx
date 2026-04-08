import { memo } from 'react';
import { OverrideLayout } from './layout';
import { LinkOverride } from './link';
import { VideoPlayer } from './video-player';

type TVideoOverrideProps = {
  src: string;
};

const VideoOverride = memo(({ src }: TVideoOverrideProps) => {
  return (
    <OverrideLayout>
      <VideoPlayer url={src} />
      <LinkOverride link={src} label="Open in new tab" />
    </OverrideLayout>
  );
});

export { VideoOverride };
